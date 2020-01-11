# exegesis-plugin-servertime

[![NPM version](https://badge.fury.io/js/exegesis-plugin-servertime.svg)](https://npmjs.org/package/exegesis-plugin-servertime)
[![Build Status](https://travis-ci.org/exegesis-js/exegesis-plugin-servertime.svg)](https://travis-ci.org/exegesis-js/exegesis-plugin-servertime)

## Summary

This is a plugin for [exegesis](https://github.com/exegesis-js/exegesis) which
uses the [servertime package](https://github.com/benbria/node-servertime) to
add a "server-timing" header to your requests, showing the different parts of
Exegesis processing and how long each part is taking (routing, security, controller
execution, response validation, etc...).

## Installation

```sh
npm install exegesis-plugin-servertime
```

## Example

To use, just add this to your Exegesis options:

```js
import exegesisServertimePlugin from 'exegesis-roles-servertime';

options = {
    plugins: [
        exegesisServertimePlugin({
            /**
             * If truthy, then only add a 'server-timing' header when NODE_ENV is not
             * "production".  Server timing information can reveal a lot about your
             * infrastructure to a potential attacker, so be careful with this.  Defaults
             * to `true`.
             */
            devOnly: true,
            /**
             * The clock to use.  `hr` is the default, high resoltuion timer.  `ms`
             * will use a lower millisecond resolution timer.
             */
            clock: 'hr',
        }),
    ],
};
```

You can also time specific parts of your controllers:

```ts
async function myController(context) {
    // Time how long it takes to read data from the DB.
    context.origRes.serverTiming.start('db');
    const users = await db.User.find();
    context.origRes.serverTiming.end('db');
    ...
}
```

Note that the "controller" timing will still show the overall length of time to
took to run the controller.

## Limitations

We reporting timing for the response validation, but not for the request validation.
Request validation is done "lazily" in Exegesis. It is always done before the
controller runs, but when exactly it happens depends on a number of factors, and
what other plugins are instaled, so it's not the easiest thing to measure. In
general you can assume that request validation falls under the umbrella of
"controller", though.

---

Copyright 2020 Jason Walton
