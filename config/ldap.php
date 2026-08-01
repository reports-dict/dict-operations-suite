<?php

return [

    /*
    |--------------------------------------------------------------------------
    | Default LDAP Connection Name
    |--------------------------------------------------------------------------
    |
    | Here you may specify which of the LDAP connections below you wish
    | to use as your default connection for all LDAP operations. Of
    | course you may add as many connections you'd like below.
    |
    */

    'default' => env('LDAP_CONNECTION', 'default'),

    /*
    |--------------------------------------------------------------------------
    | LDAP Connections
    |--------------------------------------------------------------------------
    |
    | Below you may configure each LDAP connection your application requires
    | access to. Be sure to include a valid base DN - otherwise you may
    | not receive any results when performing LDAP search operations.
    |
    */

    'connections' => [

        'default' => [
            'hosts' => explode(',', env('LDAP_DEFAULT_HOSTS', '127.0.0.1')),
            'username' => env('LDAP_DEFAULT_USERNAME', 'cn=user,dc=local,dc=com'),
            'password' => env('LDAP_DEFAULT_PASSWORD', 'secret'),
            'port' => env('LDAP_DEFAULT_PORT', 389),
            'base_dn' => env('LDAP_DEFAULT_BASE_DN', 'dc=local,dc=com'),
            'timeout' => env('LDAP_DEFAULT_TIMEOUT', 5),
            // LDAP_DEFAULT_SSL is not a distinct LdapRecord connection option in
            // this version - plain LDAPS (port 636) would be configured via the
            // host/port above instead. use_tls below is StartTLS over port 389.
            'use_tls' => env('LDAP_DEFAULT_TLS', false),
            'use_starttls' => env('LDAP_DEFAULT_TLS', false),
            'use_sasl' => env('LDAP_DEFAULT_SASL', false),
            'sasl_options' => [
                // 'mech' => 'GSSAPI',
            ],
        ],

    ],

    /*
    |--------------------------------------------------------------------------
    | LDAP Logging
    |--------------------------------------------------------------------------
    |
    | When LDAP logging is enabled, all LDAP search and authentication
    | operations are logged using the default application logging
    | driver. This can assist in debugging issues and more.
    |
    */

    'logging' => [
        'enabled' => env('LDAP_LOGGING', true),
        'channel' => env('LOG_CHANNEL', 'stack'),
        'level' => env('LOG_LEVEL', 'info'),
    ],

    /*
    |--------------------------------------------------------------------------
    | LDAP Cache
    |--------------------------------------------------------------------------
    |
    | LDAP caching enables the ability of caching search results using the
    | query builder. This is great for running expensive operations that
    | may take many seconds to complete, such as a pagination request.
    |
    */

    'cache' => [
        'enabled' => env('LDAP_CACHE', false),
        'driver' => env('CACHE_DRIVER', 'file'),
    ],

];
