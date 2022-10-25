# Yivi client

This plugin for `yivi-core` allows your Yivi flow to communicate with a back-end. 
It is highly configurable for use in many different setups. This plugin takes
care of initiating most of the transitions to the `yivi-core` state machine.

## Usage

For a simple demo where you directly start an Yivi session at an IRMA server
(**not recommended in web browsers!**, see [below](#session)) you can use this
snippet:

```javascript
const YiviCore = require('@privacybydesign/yivi-core');
const Client   = require('@privacybydesign/yivi-client');

const yivi = new YiviCore({
  session: {
    // Point this to your IRMA server:
    url: 'http://localhost:8088',

    // Define your disclosure request:
    start: {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        '@context': 'https://irma.app/ld/request/disclosure/v2',
        'disclose': [
          [
            [ 'pbdf.pbdf.email.email' ],
            [ 'pbdf.sidn-pbdf.email.email' ],
          ]
        ]
      })
    }
  }
});

yivi.use(Client);
yivi.start();
```

## Options

### debugging

This plugin listens to the `debugging` option, and will render some basic
information when debugging is enabled.

### session

The `session` options contains three property structs with options for 
starting and finishing Yivi sessions:
 - [`start`](#option-start) dealing with fetching the information needed for a new
   Yivi session (like the session pointer) from a remote server;
 - [`mapping`](#option-mapping) dealing with parsing the needed information out of
   the information fetched during [`start`](#option-start);
 - [`result`](#option-result) dealing with fetching the result from a remote server.
 
More details about these property structs can be found below.

The only separate option `session` contains is the `url` option,
specifying the url of your remote server. This option is required when you
use the `start` and/or the `result` option.

If you want to use another plugin for starting Yivi sessions, you can disable
the session functionality of `yivi-client` by saying `session: false`.
This means you have to specify a custom plugin instead that requests
the transitions related to starting and finishing a session.
It concerns the transitions in the following states:
 - The [`'Uninitialized'` state](#when-being-in-state-uninitialized)
 - The [`'Loading'` state](#when-being-in-state-loading)
 - The [`'PreparingResult'` state](#when-being-in-state-preparingresult)

General outline:
```javascript
session: {
  url: 'http://example.com/irmaserver',
  start: {
    ...
  },
  mapping: {
    ...
  },
  result: {
    ...
  }
}
```

##### Option `start`
These options define the HTTP request `yivi-client` has to do in order
to fetch the information of the Yivi session that has to be performed.
The response of this endpoint must at least contain an Yivi `sessionPtr`,
and ideally also a `frontendRequest` to use the latest features.
A session pointer and frontend request can be retrieved at the IRMA server
by using the [IRMA server library](https://godoc.org/github.com/privacybydesign/irmago/server/irmaserver#Server.StartSession),
the [IRMA server REST API](https://irma.app/docs/api-irma-server/#post-session)
or using one of the [IRMA backend packages](https://github.com/privacybydesign/irma-backend-packages).

The default values for `start` are such that an HTTP GET request is performed on
the endpoint `${o.url}/session` (during `yivi-core` state `Loading`).
In here, `o` is the value of the `session` struct as described above. The response
that is received is parsed using the specified `parseResponse`
function. The default values for `start` can be found below.

```javascript
start: {
    url:           o => `${o.url}/session`,
    parseResponse: r => r.json()
    // And the default settings for fetch()'s init parameter
    // https://developer.mozilla.org/en-US/docs/Web/API/WindowOrWorkerGlobalScope/fetch
}
```

We use the `fetch()` [default settings](https://developer.mozilla.org/en-US/docs/Web/API/WindowOrWorkerGlobalScope/fetch).
The properties from `start` are passed as custom options
to `fetch()`. This means you can use [all options](https://developer.mozilla.org/en-US/docs/Web/API/WindowOrWorkerGlobalScope/fetch)
of `fetch()`to customize the request `yivi-client` does for you. For example,
in case you want a specific POST request to be done instead of the default
GET request, you can do so.

```javascript
start: {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({
    '@context': 'https://irma.app/ld/request/disclosure/v2',
    'disclose': [
      [
        [ 'pbdf.pbdf.email.email' ],
        [ 'pbdf.sidn-pbdf.email.email' ],
      ]
    ]
  })
}
```

If you don't need your Javascript to fetch the session pointer, you can set
`start` to `false`. This is for example useful when you obtained the
session pointer, frontend request, etc. in another way. Please check the [mapping options](#option-mapping)
how to insert your custom parameters into `yivi-client`.

Be aware that when you set `start` to false, a user can only handle a session
once. When the user cancels a session or runs into some error, no restart
can be done by the user. **As a developer you are responsible yourself to take
into account alternative flows for these cases. We therefore do not recommend
disabling `start`.**

**It is also recommended to not start sessions or fetch results on the IRMA server
from a web browser directly**. Instead, you mostly have a service in between that starts
the session and checks the result for you. So in the browser the `url` property of
`session` should point to a server that you control, which isn't your IRMA server.

##### Option `mapping`
With the `mapping` properties you can specify how the session pointer, the frontend
request, the requestor token, and possibly other values
can be derived from the start session response. The response received using
the options from [`start`](#option-start) is first parsed by its `parseResponse`. The mapping
functions then specify how to map the parsed response on particular
variables. By default, the following mappings are present:
 - `sessionPtr`: the result from the `sessionPtr` mapping should be a valid Yivi
   `sessionPtr`, [as being received from the `irma server`](https://irma.app/docs/api-irma-server/#post-session).
   This mapping is mandatory. It defaults to using the `sessionPtr` field from the parsed JSON
   response of the [`start` endpoint](#option-start).
 - `sessionToken`: the result from the `sessionToken` mapping should be a valid Yivi
   requestor token, [as being received from the `irma server`](https://irma.app/docs/api-irma-server/#post-session).
   This mapping is only mandatory if the token is required by the specified [`result` endpoint](#option-result).
   It defaults to using the `token` field from the parsed JSON response of the [`start` endpoint](#option-start) (if present).
 - `frontendRequest`: the result from the `frontendRequest` mapping should be a valid Yivi
   frontend session request, [as being received from the `irma server`](https://irma.app/docs/api-irma-server/#post-session).
   It defaults to using the `frontendRequest` field from the parsed JSON response of the [`start` endpoint](#option-start) (if present).
   If not present, only frontend protocol version 1.0 is supported. This means that pairing functionality cannot be used.
   This might be a security risk. Furthermore, frontend protocol version 1.0 lacks proper support for [chained sessions](https://irma.app/docs/chained-sessions/).

Additional mappings can also be added. Their names are free to choose (as long as there is no name collision).

The resulting variables are given as payload to the `loaded` transition of the `yivi-core`
state machine. The payload is an object and the result of each `mapping` function is recorded as a field
within this object, being named after its map key. In this way the mappings can be accessed by all other plugins.
Within `yivi-client` the mappings can also be accessed as second parameter in the `url` option of
the [`result` property struct](#option-result). There it can be used to compose
the result endpoint. Furthermore, the mappings are used in several [state options](#state).

In case you obtain a session pointer (and possibly the other values) in another way than via `start`,
you can override the mapping functions to manually specify your mappings. For example, when you
somewhere collected the necessary information to start an Yivi session in JavaScript variables,
say `customQr` and `customFrontendRequest`, you can start this session by doing:

```javascript
session: {
  start: false,
  mapping: {
    sessionPtr: () => customQr,
    frontendRequest: () => customFrontendRequest
  },
  result: false
}
```

In case no mapping option is specified (i.e. the `mapping` option is not
specified within [`session`](#session)), the default mapping is used. The default
mapping can be found below.

```javascript
mapping: {
    sessionPtr:      r => r.sessionPtr,
    sessionToken:    r => r.token,
    frontendRequest: r => r.frontendRequest
}
```

##### Option `result`
These options define the HTTP request `yivi-client` has to do when an Yivi
session succeeds. In this way results of the Yivi session can be fetched.

This option has the same outline as the `start` option.
The default values are set for fetching the session result (in the `PreparingResult` state)
with a GET request on the endpoint `${o.url}/session/${sessionToken}/result`.
In this, `o` (in `${o.url}`) points to the value of the `session` struct as described above. 

We use the `fetch()` [default settings](https://developer.mozilla.org/en-US/docs/Web/API/WindowOrWorkerGlobalScope/fetch).
The `result` properties are passed as custom options
to `fetch()`. This means you can use [all options](https://developer.mozilla.org/en-US/docs/Web/API/WindowOrWorkerGlobalScope/fetch)
of `fetch()`to customize the request `yivi-client` does for you.

If you don't need your Javascript to fetch a session result, you can set
`result` to `false`. The `yivi-core` Promise will then just resolve
with the `mapping` values as result when the session is done.

The default values for the `result` options can be found below.

```javascript
result: {
    url:           (o, {sessionPtr, sessionToken}) => `${o.url}/session/${sessionToken}/result`,
    parseResponse: r => r.json()
    // And the default settings for fetch()'s init parameter
    // https://developer.mozilla.org/en-US/docs/Web/API/WindowOrWorkerGlobalScope/fetch
  }
```

### state

The `state` option tells the plugin what states it should use and how to subscribe for
listeners that monitor state changes on the IRMA server. You can find an overview of
the possible option sets in the subsections.

There are two general options, `url` and `legacyUrl`, to determine the location of the
frontend endpoints of the IRMA server. The `legacyUrl` is used for frontend protocol
version 1.0 (for [IRMA server](https://irma.app/docs/irma-server/) v0.7.x and earlier)
and the `url` is used for frontend protocol version 1.1 and above.

These are the accepted general properties and their defaults:

```javascript
state: {
  url:       (m, endpoint) => `${m.sessionPtr.u}/frontend/${endpoint}`, 
  legacyUrl: (m, endpoint) => `${m.sessionPtr.u}/${endpoint}`,
  ...
}
```

The URL from `m.sessionPtr.u` will point directly to your IRMA server.
This is intentional; the Yivi app should be able to access those endpoints too.

#### State monitoring
For state monitoring, we offer the options `serverSentEvents` and `polling`.
By default, the plugin tries to use Server Sent Events for receiving state changes, and if
that fails it will fall back to basic polling. You can disable either feature by setting
the option to `false` instead of an object.

These are the accepted properties and their defaults for state monitoring:

```javascript
state: {
    serverSentEvents: {
      endpoint: 'statusevents',
      timeout:  2000
    },

    polling: {
      endpoint:   'status',
      interval:   500,
      startState: 'INITIALIZED'
    }
}
```

#### Cancellation
The `irma server` knows an endpoint to delete sessions. This endpoint is being
used to communicate session cancellation initiated by the user via this library.
Communicating cancellation to the `irma server` can be disabled by
setting the `cancel` option to `false` instead of an object.

These are the accepted properties and their defaults for cancellation:

```javascript
state: {
    cancel: {
      url: m => m.sessionPtr['u']
    },
}
```

The URL from `m.sessionPtr['u']` will point directly to your IRMA server.
This is intentional; the Yivi app should be able to access those endpoints too.

Please remark that for cancellation there is no frontend specific endpoint at the Yivi
server. Therefore, the URL of the cancellation endpoint deviates from the frontend
endpoint format being specified by the [general `url` option](#state) above.

#### Pairing
The pairing state is an optional state that can be introduced to prevent QR theft,
added between scanning a Yivi QR code and actually performing the session.
In this state, a pairing code is visible in the Yivi app. The user should enter
that pairing code in the frontend to continue.
For the following session types it is important that the right user
scans the QR, since the session might contain sensitive information.
 - Issuing sessions
 - Disclosing sessions with fixed attribute values (e.g. show that your email address is example@example.com)
 - Signing sessions (the message that needs signing might contain sensitive information)
 - Chained sessions (i.e. a `nextSession` is being specified as [extra parameter](https://irma.app/docs/session-requests/#extra-parameters)
   in the session request)

For these session types, the `frontendRequest` will include an extra field `"pairingHint": true`.
When this happens, pairing will be enabled by default when a QR is scanned. In case
of a mobile session, a pairing state is never introduced.

In case you do not want a pairing state to happen for the above session
types, the pairing state can be disabled by setting the `pairing` option to `false`
instead of an object. You can also change the condition in which pairing is enabled
by modifying the `onlyEnableIf` option. For example, you can enable pairing
unconditionally by doing `onlyEnableIf: () => true`.

These are the accepted properties and their defaults for pairing. You can
overrule options one by one. When you don't specify an option explicitly,
the default value is used.

```javascript
state: {
  frontendOptions: {
    endpoint:           'options',
    requestContext:     'https://irma.app/ld/request/options/v1'
   },

   pairing: {
     onlyEnableIf:      m => m.frontendRequest.pairingHint,
     completedEndpoint: 'pairingcompleted',
     minCheckingDelay:  500, // Minimum delay before accepting or rejecting a pairing code, for better user experience.
     pairingMethod:     'pin'
   }
}
```

As an example on how to use the pairing options, you can specify the following options
if you want to disable pairing in all cases. Only do this if you are aware of the
security implications!

```javascript
state: {
   pairing: false
}
```

## Behaviour
This plugin initiates the following transitions to the `yivi-core` state machine.

### When being in state `Uninitialized`
If `session` option is set to `false`, the plugin does nothing in this state.

Otherwise, this plugin will initiate the `initialize` transition when `start()`
is called. The `canRestart` indicator is set to true when the [`start` option](#option-start)
is enabled (so if `start` is not explicitly set to `false`).

| Possible transitions | With payload               | Next state          |
|----------------------|----------------------------|---------------------|
| `initialize`         | { canRestart: true/false } | Loading             |

### When being in state `Loading`

If `session` option is set to `false`, the plugin does nothing in this state.

Otherwise this plugin:
 * Fetches the `start` endpoint (unless `start` is explicitly set to `false`).
 * Extracts the session pointer (and, if specified, the session token and frontend authentication token)
   using the functions from the `mapping` option.

| Possible transitions | With payload              | Next state          |
|----------------------|---------------------------|---------------------|
| `loaded`             | mappings                  | CheckingUserAgent   |
| `fail`               | Error that fetch returned | Error               |

### When being in state `CheckingUserAgent`

Determines which flow should be started: the QR flow or the mobile flow.

| Possible transitions | With payload | Next state          |
|----------------------|--------------|---------------------|
| `prepareQRCode`      |              | PreparingQRCode     |
| `prepareButton`      |              | PreparingYiviButton |

### When being in state `PreparingQRCode` or `PreparingYiviButton`

In these states the plugin prepares for showing a QR or a button to a mobile session.
This includes enabling or disabling the pairing state if necessary.

| Possible transitions                               | With payload                                             | Next state        |
|----------------------------------------------------|----------------------------------------------------------|-------------------|
| `showQRCode` if state is `PreparingQRCode`         | `{qr: <payload for in QRs>, showBackButton: true/false}` | ShowQRCode        |
| `showYiviButton` if state is `PreparingYiviButton` | `{mobile: <app link for launching the Yivi app>}`        | ShowYiviButton    |
| `fail` if updating pairing state fails             | Error that fetch returned                                | Error             |

### When being in state `ShowingQRCode` or `ShowingYiviButton`

In these states the plugin polls the status at IRMA server using the `state` options.

| Possible transitions                        | With payload              | Next state                              |
|---------------------------------------------|---------------------------|-----------------------------------------|
| `appConnected` if new status is `CONNECTED` |                           | ContinueOn2ndDevice / ContinueInYiviApp |
| `appPairing` if new status is `PAIRING`     |                           | EnterPairingCode                        |
| `timeout` if new status is `TIMEOUT`        |                           | TimedOut                                |
| `cancel` if new status is `CANCELLED`       |                           | Cancelled                               |
| `fail` if sse/polling fails                 | Error that fetch returned | Error                                   |

### When being in state `EnterPairingCode`

In these states the plugin polls the status at IRMA server using the `state` options.

| Possible transitions                        | With payload              | Next state                              |
|---------------------------------------------|---------------------------|-----------------------------------------|
| `timeout` if new status is `TIMEOUT`        |                           | TimedOut                                |
| `cancel` if new status is `CANCELLED`       |                           | Cancelled                               |
| `fail` if sse/polling fails                 | Error that fetch returned | Error                                   |

### When being in state `Pairing`

In these states the plugin polls the status at IRMA server using the `state` options.

| Possible transitions                                   | With payload              | Next state          |
|--------------------------------------------------------|---------------------------|---------------------|
| `pairingRejected` if entered pairing code is incorrect | Rejected pairing code     | EnterPairingCode    |
| `appConnected` if new status is `CONNECTED`            |                           | ContinueOn2ndDevice |
| `timeout` if new status is `TIMEOUT`                   |                           | TimedOut            |
| `cancel` if new status is `CANCELLED`                  |                           | Cancelled           |
| `fail` if sse/polling fails                            | Error that fetch returned | Error               |

### When being in state `ContinueOn2ndDevice` or `ContinueInYiviApp`

In this state we continue polling the IRMA server using the `state` options.

| Possible transitions                        | With payload              | Next state        |
|---------------------------------------------|---------------------------|-------------------|
| `prepareResult` if new status is `DONE`     |                           | PreparingResult   |
| `timeout` if new status is `TIMEOUT`        |                           | TimedOut          |
| `cancel` if new status is `CANCELLED`       |                           | Cancelled         |
| `fail` if sse/polling fails                 | Error that fetch returned | Error             |

### When being in state `PreparingResult`

If the `session` option is set to `false`, the plugin does nothing in this state.

Otherwise, when the `result` endpoint is enabled (so if `result` is not explicitly set to `false`),
then the `result` endpoint is fetched.

| Possible transitions                 | With payload              | Next state   |
|--------------------------------------|---------------------------|--------------|
| `succeed` if result can be fetched   | Fetched result            | Succeed      |
| `succeed` if result is disabled      |                           | Succeed      |
| `fail` if fetching the result failed | Error that fetch returned | Error        |
