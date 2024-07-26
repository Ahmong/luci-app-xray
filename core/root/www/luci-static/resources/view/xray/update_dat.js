/**
 * @license
 * Copyright 2020 Xingwang Liao <kuoruan@gmail.com>
 *
 * Licensed to the public under the MIT License.
 */

"use strict";

"require form";
"require fs";
"require request";
"require rpc";
"require uci";
"require ui";
'require baseclass';

'require view/xray/custom as custom'
// "require v2ray";
"require view";

// "require tools/widgets as widgets";

// "require view/v2ray/include/custom as custom";
// "require view/v2ray/tools/converters as converters";

const urls = {
  geosite: {
    github: "https://github.com/Loyalsoldier/v2ray-rules-dat/releases/latest/download/geosite.dat",
    jsdelivr: "https://cdn.jsdelivr.net/gh/Loyalsoldier/v2ray-rules-dat@release/geoip.dat",
  },
  geoip: {
    github: "https://github.com/Loyalsoldier/v2ray-rules-dat/releases/latest/download/geoip.dat",
    jsdelivr: "https://ftp.arin.net/pub/stats/apnic/delegated-apnic-latest",
  },
};

const callUpdateDataFile = 
  rpc.declare({
    object: "xray",
    method: "updatedatafile",
    params: [ "name", "url" ],
    expect: { "": { code: 1 } },
    /*
    filter: function (data) {
      if (data.code === 0) {
        return {
          count: data.count,
          datetime: data.datetime,
        };
      }
      return {
        count: 0,
        datetime: _("Unknown"),
      };
    },
    */
});

return view.extend({

  handleListUpdate(ev/*: MouseEvent*/, section_id/*: string*/, listtype/*: string*/) {
    const hideModal = function () {
      ui.hideModal();

      window.location.reload();
    };

    const geositeMirror = uci.get("xray_core", section_id, listtype) || "github";
    const url = urls[listtype][geositeMirror];

    return callUpdateDataFile(listtype, url)
      .then(function (res/*: LuCI.response*/) {
        console.log('res', res);
        if (res["code"] == 1) {
          ui.showModal(_("List Update"), [
            E("p", _(listtype + " updated.")),
            E(
              "div",
              { class: "right" },
              E(
                "button",
                {
                  class: "btn",
                  click: hideModal,
                },
                _("OK")
              )
            ),
          ]);
        }
        else {
          ui.addNotification(null, E("p", 'Update failed' + (res['msg'] || '')));
        }
      })
      // .catch(res => L.raise("Error", res.statusText))
      .catch(function (e) {
        ui.addNotification(null, E("p", e.message));
      });
  },

  update_dat_options: function (s, tab) {
    let o;

    o = s.taboption(tab, form.ListValue, "geosite_url", _("geosite update mirror"));
    o.value("github", "GitHub");
    o.value("jsdelivr", "JsDelivr");
    o.default = "github";

    o = s.taboption(tab, custom.ListStatusValue, "_geosite", _("geosite.dat"));
    o.listtype = "geosite";
    o.btntitle = _("Update");
    o.btnstyle = "apply";
    o.onupdate = L.bind(this.handleListUpdate, this);

    o = s.taboption(tab, form.ListValue, "geoip_rul", _("geoip update mirror"));
    o.value("github", "GitHub");
    o.value("jsdelivr", "JsDelivr");
    o.default = "github";

    o = s.taboption(tab,  custom.ListStatusValue, "_geoip", _("geoip.dat"));
    o.listtype = "geoip";
    o.btntitle = _("Update");
    o.btnstyle = "apply";
    o.onupdate = L.bind(this.handleListUpdate, this);
  }

});