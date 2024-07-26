"use strict";

import { port_array, stream_settings } from "../common/stream.mjs";

export function free_outbound(server, tag) {
    const stream_settings_object = stream_settings(server, "free", tag);
    const stream_settings_result = stream_settings_object["stream_settings"];
    return {
        outbound: {
            protocol: "freedom",
            tag: tag,
            settings: {},
            streamSettings: stream_settings_result
        }
    };
};
