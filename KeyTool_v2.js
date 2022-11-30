//"use strict";
/*
 * Copyright 2019 Google Inc. All Rights Reserved.
 *
 *  Licensed under the Apache License, Version 2.0 (the "License");
 *  you may not use this file except in compliance with the License.
 *  You may obtain a copy of the License at
 *
 *      http://www.apache.org/licenses/LICENSE-2.0
 *
 *  Unless required by applicable law or agreed to in writing, software
 *  distributed under the License is distributed on an "AS IS" BASIS,
 *  WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 *  See the License for the specific language governing permissions and
 *  limitations under the License.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.KeyTool_v2 = void 0;
const fs_1 = require("fs");
//const util_1 = require("../util");
//const util_1 = require("../Log");
const util_1 = require("./node_modules/@bubblewrap/core/dist/lib/util");
const Log_1 = require("./node_modules/@bubblewrap/core/dist/lib/Log");
/**
 * A Wrapper of the Java keytool command-line tool
 */
class KeyTool_v2 {
    constructor(jdkHelper, log = new Log_1.ConsoleLog('keytool')) {
        this.jdkHelper = jdkHelper;
        this.log = log;
    }
    /**
     * Creates a new signing key.
     *
     * @param {CreateKeyOptions} keyOptions arguments to use to generate the key.
     * @param {boolean} overwrite true if an existing key should be overwriten.
     * @returns {Promise<void>}
     */
    async createSigningKey(keyOptions, overwrite = false) {
        this.log.debug('Generating Signature with keyOptions:', JSON.stringify(keyOptions));
        // Checks if the key already exists and deletes it, if overriting is enabled.
        if (fs_1.existsSync(keyOptions.path)) {
            if (overwrite) {
                await fs_1.promises.unlink(keyOptions.path);
            }
            else {
                return;
            }
        }
        // Execute Java Keytool
        const dname = `cn=${KeyTool_v2.escapeDName(keyOptions.fullName)}, ` +
            `ou=${KeyTool_v2.escapeDName(keyOptions.organizationalUnit)}, ` +
            `o=${KeyTool_v2.escapeDName(keyOptions.organization)}, ` +
            `c=${KeyTool_v2.escapeDName(keyOptions.country)}`;
        const keytoolCmd = [
            'keytool',
            '-genkeypair',
            `-dname "${dname}"`,
            `-alias "${util_1.escapeDoubleQuotedShellString(keyOptions.alias)}"`,
            `-keypass "${util_1.escapeDoubleQuotedShellString(keyOptions.keypassword)}"`,
            `-keystore "${util_1.escapeDoubleQuotedShellString(keyOptions.path)}"`,
            `-storepass "${util_1.escapeDoubleQuotedShellString(keyOptions.password)}"`,
            '-validity 20000',
            '-keyalg RSA',
        ];
        const env = this.jdkHelper.getEnv();
        await util_1.execute(keytoolCmd, env);
        this.log.info('Signing Key created successfully');
    }
    /**
     * Runs `keytool --list` on the keystore / alias provided on the {@link KeyOptions}.
     *
     * @param {KeyOptions} keyOptions parameters for they key to be listed.
     * @returns {Promise<string>} the raw output of the `keytool --list` command
     */
    async list(keyOptions) {
        if (!fs_1.existsSync(keyOptions.path)) {
            throw new Error(`Couldn't find signing key at "${keyOptions.path}"`);
        }
        const keyListCmd = [
            'keytool',
            // Forces the language to 'en' in order to get the expected formatting.
            // The JVM seems to ignore the LANG and LC_ALL variables, so we set the value
            // when invoking the command. See https://github.com/GoogleChromeLabs/bubblewrap/issues/446
            // for more.
            '-J-Duser.language=en',
            '-list',
            '-v',
            `-keystore "${util_1.escapeDoubleQuotedShellString(keyOptions.path)}"`,
            //sundy not mandatory `-alias "${util_1.escapeDoubleQuotedShellString(keyOptions.alias)}"`,
            `-storepass "${util_1.escapeDoubleQuotedShellString(keyOptions.password)}"`,
            `-keypass "${util_1.escapeDoubleQuotedShellString(keyOptions.keypassword)}"`,
        ];
        const env = this.jdkHelper.getEnv();
        const result = await util_1.execute(keyListCmd, env);
        return result.stdout;
    }
    /**
     * Runs `keytool --list` on the keystore / alias provided on the {@link KeyOptions}. Currently,
     * only extracting fingerprints is implemented.
     *
     * @param {KeyOptions} keyOptions parameters for they key to be listed.
     * @returns {Promise<KeyInfo>} the parsed output of the `keytool --list` command
     */
    async keyInfo(keyOptions) {
        const rawKeyInfo = await this.list(keyOptions);
        return KeyTool_v2.parseKeyInfo(rawKeyInfo);
    }
    /**
     * The commas in the dname field from key tool must be escaped, so that 'te,st' becomes 'te\,st'.
     */
    static escapeDName(input) {
        return input.replace(/([,$`])/g, '\\$1');
    }
    /**
     * Parses the output of `keytool --list` and returns a structured {@link KeyInfo}. Currently,
     * only extracts the alias name and fingerprints.
     */
    static parseKeyInfo(rawKeyInfo) {
        const lines = rawKeyInfo.split('\n');
        const fingerprints = new Map();
        const fingerprintTags = ['Alias name', 'SHA1', 'SHA256'];//sundy add 'Alias name' 11232022
        lines.forEach((line) => {
            line = line.trim();
            fingerprintTags.forEach((tag) => {
                if (line.startsWith(tag)) {
                    // a fingerprint line has the format <tag>: <value>. So, we account for the extra colon
                    // when substringing and then trim to remove whitespaces.
                    const value = line.substring(tag.length + 1, line.length).trim();
                    fingerprints.set(tag, value);
                }
            });
        });
        /*var strV = fingerprints.get('Alias name');
        this.log.debug("Alias name:" + strV);*/
        return {
            fingerprints: fingerprints,
        };
    }
}
exports.KeyTool_v2 = KeyTool_v2;
