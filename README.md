# WakaTime for Nova

[![Coding time tracker](https://wakatime.com/badge/github/wakatime/WakaTime.novaextension.png?branch=master)](https://wakatime.com/badge/github/wakatime/WakaTime.novaextension)

Metrics, insights, and time tracking automatically generated from your programming activity.


## Installation

1. Navigate to the Extension Library inside Nova (`Shift + ⌘ + 2`).

2. Search for `wakatime`, hit `enter`, then click `Install`.

3. Enter your [api key](https://wakatime.com/api-key), then click `Save`.

	> (If you’re not prompted, navigate to `Extensions → WakaTime → API Key` or `⌘ + Shift + P` then type `apikey`.)

4. Use Nova and your coding activity will be displayed on your [WakaTime dashboard](https://wakatime.com).


## Usage

Visit https://wakatime.com to see your coding activity.

![Project Overview](https://wakatime.com/static/img/ScreenShots/Screen-Shot-2016-03-21.png)


## Configuring

Extension settings are stored in the INI file at `$HOME/.wakatime.cfg`.

More information can be found from [wakatime core](https://github.com/wakatime/wakatime#configuring).


## Troubleshooting

First, turn on debug mode:

1. Press `⌘ + Shift + P`
2. Type `debug mode, and press `Enter`.
3. Select `enable`, then press `Enter`.

Next, open your Extensions Console window (`Extensions → Show Extension Console`) to view the plugin's logs and errors.

Errors outside the scope of this plugin go to `$HOME/.wakatime.log` from [wakatime-cli][wakatime-cli-help].

The [How to Debug Plugins][how to debug] guide shows how to check when coding activity was last received from your editor using the [Plugins Status Page][plugins status page].

For more general troubleshooting info, see the [wakatime-cli Troubleshooting Section][wakatime-cli-help].

[wakatime-cli-help]: https://github.com/wakatime/wakatime#troubleshooting
[how to debug]: https://wakatime.com/faq#debug-plugins
[plugins status page]: https://wakatime.com/plugin-status