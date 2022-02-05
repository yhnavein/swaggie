```
Usage: swaggie [options]

Options:

  -h, --help               output usage information
  -V, --version            output the version number
  -c, --config <path>      The path to the configuration JSON file. You can do all the set up there instead of parameters in the CLI
  -s, --src <url|path>     The url or path to the Open API spec file
  -t, --template <string>  Template used forgenerating API client. Default: "axios"
  -o, --out <path>         The path to the file where the API would be generated
  -b, --baseUrl <string>   Base URL that will be used as a default value in the clients. Default: ""
  --preferAny              Use "any" type instead of "unknown". Default: false
  --servicePrefix <string>  Prefix for service names. Useful when you have multiple APIs and you want to avoid name collisions. Default: ''
  --queryModels <bool>     Generate models for query string instead list of parameters. Default: false
```
