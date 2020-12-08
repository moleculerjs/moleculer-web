"use strict";

const _ = require("lodash");

const users = [{
    id: "unique-user-id-1",
    password: "secret-password",
    name: "username-1",
    setting: {
        id: "unique-settings-id1",
        privateKey: "super-secret-private-key"
    }
}, {
    id: "unique-user-id-2",
    password: "secret-password",
    name: "username-2",
    setting: {
        id: "unique-settings-id2",
        privateKey: "super-secret-private-key"
    }
}];

module.exports = {
    name: "users",

    actions: {
        list: {
            rest: "GET /",
            sanitize: ["password", { from: "id", to: "userId" }, "setting.privateKey", { from: "setting.id", to: "setting.settingId" }],
            handler(ctx) {
                return users;
            }
        },
        get: {
            rest: "GET /:id",
            sanitize: ["password", { from: "id", to: "userId" }, "setting.privateKey", { from: "setting.id", to: "setting.settingId" }],
            handler(ctx) {
                return users.find(u => u.id === ctx.params.id);
            }
        }
    }
};
