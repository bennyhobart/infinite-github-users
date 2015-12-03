'use strict';
import Rx from 'rx';
import http from 'http';
import fetch from 'isomorphic-fetch';

const NUM_USERS_PER_REQUEST = 30;
const initialStream = new Rx.ReplaySubject();
initialStream.onNext();

const requestStream = initialStream
    .map((_, index) => index)
    .filter(x => x % NUM_USERS_PER_REQUEST === 0)
    .map(x => `https://api.github.com/users?since=${x * NUM_USERS_PER_REQUEST}`)
    .flatMap(url => fetch(url))
    .concatMap(res => res.json());

const userStream = requestStream
    .concatMap(users => Rx.Observable.from(users))
    .shareReplay();

const connectionDataStream = Rx.Observable.create(obs => {
    const server = http.createServer(function(req, res) {
        obs.onNext(res);
    });
    server.listen(3000, () => process.stdout.write('Server Listening on 3000'));
}).doOnNext(() => initialStream.onNext());


connectionDataStream
    .zip(userStream, (res, user) => ({
        res,
        user
    }))
    .forEach(({res, user}) => {
        res.end(JSON.stringify(user));
    });

