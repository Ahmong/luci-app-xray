/**
 * @license
 * Copyright 2020 Xingwang Liao <kuoruan@gmail.com>
 *
 * Licensed to the public under the MIT License.
 */

"use strict";

// "require baseclass";
// "require dom";
"require form";
"require fs";
// "require poll";
"require rpc";
"require uci";
"require ui";


const callListStatus = rpc.declare({
  object: "xray",
  method: "listStatus",
  params: ["name"],
  expect: { "": { code: 1 } },
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
});

const CUSTOMTextValue = form.TextValue.extend({
  __name__: "CUSTOM.TextValue",
  filepath: null,
  isjson: false,
  required: false,
  cfgvalue: function () {
    if (!this.filepath) {
      return this.super("cfgvalue", L.toArray(arguments));
    }

    return L.resolveDefault(fs.read(this.filepath), "");
  },
  write: function (__, value) {
    if (!this.filepath) {
      return this.super("write", L.toArray(arguments));
    }

    const trimmed = value.trim().replace(/\r\n/g, "\n") + "\n";
    return fs.write(this.filepath, trimmed);
  },
  validate: function (section_id, value) {
    if (this.required && !value) {
      const title = this.titleFn("title", section_id);
      return _("%s is required.").format(title);
    }

    if (this.isjson) {
      let obj;
      try {
        obj = JSON.parse(value);
      } catch (e) {
        obj = null;
      }

      if (!obj || typeof obj !== "object") {
        return _("Invalid JSON content.");
      }
    }

    return true;
  },
});

const defStat = {
  count: 0,
  datetime: _("Unknown"),
}

const CUSTOMListStatusValue = form.AbstractValue.extend({
  __name__: "CUSTOM.ListStatusValue",
  listtype: null,
  onupdate: null,
  btnstyle: "button",
  btntitle: null,
  cfgvalue: function (name) {
    if (!this.listtype) {
      L.error("TypeError", _("Listtype is required"));
    }

    if (name.indexOf('cfg') == 0) return defStat;

    return fs.stat('/usr/share/xray/' + name + '.dat')
      .then(stat => ({
          count: '%.2mB'.format(stat.size),
          datetime: new Date(stat.mtime * 1000).toLocaleDateString('zh-CN', {
            year: 'numeric',
            month: '2-digit',
            day: '2-digit',
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit',
            hour12: false,
          }),
      }))
      .catch(() => {
        return defStat;
      })
  },
  render: function (option_index, section_id) {
    return Promise.resolve(this.cfgvalue(this.listtype)).then(
      L.bind(function ({ count = 0, datetime = "" } = {}) {
        const title = this.titleFn("title", section_id);

        const config_name =
          this.uciconfig || this.section.uciconfig || this.map.config;
        const depend_list = this.transformDepList(section_id);

        const fieldChildren = [
          E("div", {}, [
            E(
              "span",
              {
                style: "color: #ff8c00;margin-right: 5px;",
              },
              _("Total: %s").format(count)
            ),
            _("Updated: %s").format(datetime),
            E(
              "button",
              {
                style: "margin-left: 10px;",
                class: "cbi-button cbi-button-%s".format(
                  this.btnstyle || "button"
                ),
                click: ui.createHandlerFn(
                  this,
                  function (
                    section_id,
                    listtype,
                    ev
                  ) {
                    if (typeof this.onupdate === "function") {
                      return this.onupdate(ev, section_id, listtype);
                    }
                  },
                  section_id,
                  this.listtype
                ),
              },
              this.titleFn("btntitle", section_id) || title
            ),
          ]),
        ];

        if (typeof this.description === "string" && this.description !== "") {
          fieldChildren.push(
            E("div", { class: "cbi-value-description" }, this.description)
          );
        }

        const optionEl = E(
          "div",
          {
            class: "cbi-value",
            id: "cbi-%s-%s-%s".format(config_name, section_id, this.option),
            "data-index": option_index,
            "data-depends": depend_list,
            "data-field": this.cbid(section_id),
            "data-name": this.option,
            "data-widget": this.__name__,
          },
          [
            E(
              "label",
              {
                class: "cbi-value-title",
                for: "widget.cbid.%s.%s.%s".format(
                  config_name,
                  section_id,
                  this.option
                ),
              },
              [title]
            ),
            E("div", { class: "cbi-value-field" }, fieldChildren),
          ]
        );

        if (depend_list && depend_list.length) {
          optionEl.classList.add("hidden");
        }

        optionEl.addEventListener(
          "widget-change",
          L.bind(this.map.checkDepends, this.map)
        );

        L.dom.bindClassInstance(optionEl, this);

        return optionEl;
      }, this)
    );
  },
  remove: function () {},
  write: function () {},
});

const CUSTOMRunningStatus = form.AbstractValue.extend({
  __name__: "CUSTOM.RunningStatus",
  fetchVersion: function (node) {
    L.resolveDefault(callV2RayVersion(), "").then(function (version) {
      L.dom.content(
        node,
        version
          ? _("Version: %s").format(version)
          : E("em", { style: "color: red;" }, _("Unable to get V2Ray version."))
      );
    });
  },
  pollStatus: function (node) {
    const notRunning = E("em", { style: "color: red;" }, _("Not Running"));
    const running = E("em", { style: "color: green;" }, _("Running"));

    L.Poll.add(function () {
      L.resolveDefault(callRunningStatus(), { code: 0 }).then(function (res) {
        L.dom.content(node, res.code ? notRunning : running);
      });
    }, 5);
  },
  load: function () {},
  cfgvalue: function () {},
  render: function () {
    const status = E(
      "span",
      {
        style: "margin-left: 5px",
      },
      E("em", {}, _("Collecting data..."))
    );

    const version = E("span", {}, _("Getting..."));

    this.pollStatus(status);
    this.fetchVersion(version);

    return E("div", { class: "cbi-value" }, [status, " / ", version]);
  },
  remove: function () {},
  write: function () {},
});

return L.Class.extend({
  TextValue: CUSTOMTextValue,
  ListStatusValue: CUSTOMListStatusValue,
  RunningStatus: CUSTOMRunningStatus,
});
