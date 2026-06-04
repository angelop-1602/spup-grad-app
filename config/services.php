<?php

return [

    /*
    |--------------------------------------------------------------------------
    | Third Party Services
    |--------------------------------------------------------------------------
    |
    | This file is for storing the credentials for third party services such
    | as Mailgun, Postmark, AWS and more. This file provides the de facto
    | location for this type of information, allowing packages to have
    | a conventional file to locate the various service credentials.
    |
    */

    'postmark' => [
        'key' => env('POSTMARK_API_KEY'),
    ],

    'resend' => [
        'key' => env('RESEND_API_KEY'),
    ],

    'ses' => [
        'key' => env('AWS_ACCESS_KEY_ID'),
        'secret' => env('AWS_SECRET_ACCESS_KEY'),
        'region' => env('AWS_DEFAULT_REGION', 'us-east-1'),
    ],

    'slack' => [
        'notifications' => [
            'bot_user_oauth_token' => env('SLACK_BOT_USER_OAUTH_TOKEN'),
            'channel' => env('SLACK_BOT_USER_DEFAULT_CHANNEL'),
        ],
    ],

    'freeconvert' => [
        'api_keys' => array_values(array_filter([
            env('FREECONVERT_API_KEY_1'),
            env('FREECONVERT_API_KEY_2'),
            env('FREECONVERT_API_KEY_3'),
        ])),
        'legacy_api_key' => env('FREECONVERT_API_KEY'),
        'legacy_api_keys' => env('FREECONVERT_API_KEYS'),
        'base_url' => env('FREECONVERT_BASE_URL', 'https://api.freeconvert.com/v1'),
        'timeout' => (int) env('FREECONVERT_TIMEOUT', 120),
        'poll_interval' => (int) env('FREECONVERT_POLL_INTERVAL', 2),
        'max_attempts' => (int) env('FREECONVERT_MAX_ATTEMPTS', 3),
        'retry_delay_ms' => (int) env('FREECONVERT_RETRY_DELAY_MS', 1000),
    ],

];
