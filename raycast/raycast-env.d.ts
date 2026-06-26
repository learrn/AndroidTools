/// <reference types="@raycast/api">

/* 🚧 🚧 🚧
 * This file is auto-generated from the extension's manifest.
 * Do not modify manually. Instead, update the `package.json` file.
 * 🚧 🚧 🚧 */

/* eslint-disable @typescript-eslint/ban-types */

type ExtensionPreferences = {
  /** ADB Path - Path to adb executable */
  "adbPath": string
}

/** Preferences accessible in all the extension's commands */
declare type Preferences = ExtensionPreferences

declare namespace Preferences {
  /** Preferences accessible in the `devices` command */
  export type Devices = ExtensionPreferences & {}
  /** Preferences accessible in the `install-apk` command */
  export type InstallApk = ExtensionPreferences & {}
  /** Preferences accessible in the `adb-shell` command */
  export type AdbShell = ExtensionPreferences & {}
  /** Preferences accessible in the `set-proxy` command */
  export type SetProxy = ExtensionPreferences & {}
  /** Preferences accessible in the `clear-proxy` command */
  export type ClearProxy = ExtensionPreferences & {}
  /** Preferences accessible in the `screenshot` command */
  export type Screenshot = ExtensionPreferences & {}
}

declare namespace Arguments {
  /** Arguments passed to the `devices` command */
  export type Devices = {}
  /** Arguments passed to the `install-apk` command */
  export type InstallApk = {}
  /** Arguments passed to the `adb-shell` command */
  export type AdbShell = {}
  /** Arguments passed to the `set-proxy` command */
  export type SetProxy = {}
  /** Arguments passed to the `clear-proxy` command */
  export type ClearProxy = {}
  /** Arguments passed to the `screenshot` command */
  export type Screenshot = {}
}

