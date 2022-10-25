# Yivi core

This package contains the state machine for implementing Yivi flows. `yivi-core`
itself does not provide any real functionality. Plugins can be registered at
the state machine and the plugins then provide the functionality depending on
the state the state machine is in. The plugins can also request state modifications
to the state machine.
                                                                     
Yivi core can be initialized in the following way:

```javascript
const YiviCore = require('@privacybydesign/yivi-core');
const yivi     = new YiviCore(/* options */);

yivi.use(/* Plugin A */);
yivi.use(/* Plugin B */);

yivi.start();
```

You can pass an options object to the constructor, which will be passed on to
each plugin that you register. Each plugin can choose which of your options to
use or ignore.

```javascript
const yivi = new YiviCore({
  debugging: true,            // Used by state machine and multiple plugins
  element:   '#yivi-web-form' // Used by `yivi-web` plugin
});
```

## Documentation
More elaborate documentation on how to use this module can be found in the
[Yivi documentation](https://irma.app/docs/irma-frontend/#irma-core). You
can also find here how to [design your own plugin](https://irma.app/docs/irma-frontend/#make-your-own-irma-core-plugin).

## API
### `use` method
With the `use` method, new plugins can be added to the Yivi core instance.
This method takes care of instantiating the plugin. You simply pass the
plugin class as an argument to this function; you must not instantiate
the plugin yourself.

```javascript
yivi.use(/* Plugin A */);
yivi.use(/* Plugin B */);
```

### `start` method
The `start` method starts the state machine and returns a Promise. Whatever
parameters you pass to the `start` method get passed to the `start` method of
the plugins too, but no plugins currently make use of that.

```javascript
yivi.start()
    .then(result => console.log("Successful disclosure! 🎉", result))
    .catch(error => console.error("Couldn't do what you asked 😢", error));
```

The returned Promise only resolves when the state machine reaches the `Success` state
and only rejects when the machine reaches a state with a final transaction.
The end states `BrowserNotSupported` and `Aborted` always lead to a reject.
The other possible end states are `Cancelled`, `Timeout` and `Error`.

In case none of the plugins supplied a return value via its
`close()` method (which is the case for all our plugins in the `/plugin` directory),
the return value on resolve will be the payload of the 'succeed' transition.
In case of reject, the return value indicates in what state the state machine stopped,
so: `BrowserNotSupported`, `Cancelled`, `Timeout`, `Error` or `Aborted`.

In case one or more plugins return a value on `close()`, the return value will be
an array containing the `yivi-core` return value (as described above) as first item
and the return values of the plugins as subsequent items. The order of the
subsequent items is determined by the order in which the plugins were
added with 'use'. Plugins that did not return a value, have the result
`undefined` then.

```javascript
yivi.start()
    .then(result => console.log("Successful disclosure! 🎉", result))
    .catch(error => {
          if (error === 'Aborted') {
            console.log('We closed it ourselves, so no problem 😅');
            return;
          }
          console.error("Couldn't do what you asked 😢", error);
    });
```

In the reject case, plugins may already inform the user of this issue, so please
test if you need to catch the state yourself. You may wish to fall back to
another authentication method automatically by catching the rejection and
redirecting the user.

### `abort` method
The `abort` method forces an `yivi-core` instance to abort the session and
all associated plugins should stop making changes. In this way you can stop
the instance from being active when it is not relevant anymore. The promise
returned by the `start` method will be rejected with a `Aborted` message
when `abort` is called. When `start` has not been called yet or when the
`start` promise has already finished, then calling `abort` has no effect.

```javascript
yivi.abort();
```
