# shellcheck shell=bash
#
# Tiny color-aware logging helpers. Source this file from any script.
# All functions accept arguments as a message; piping is fine too.

# Detect whether stdout is a terminal so colors don't pollute logs.
if [[ -t 1 && -z "${NO_COLOR:-}" ]]; then
  __c_reset=$'\033[0m'
  __c_dim=$'\033[2m'
  __c_bold=$'\033[1m'
  __c_red=$'\033[31m'
  __c_green=$'\033[32m'
  __c_yellow=$'\033[33m'
  __c_blue=$'\033[34m'
  __c_magenta=$'\033[35m'
  __c_cyan=$'\033[36m'
else
  __c_reset='' __c_dim='' __c_bold='' __c_red='' __c_green='' __c_yellow=''
  __c_blue='' __c_magenta='' __c_cyan=''
fi

log::step()  { printf '%s▸%s %s%s%s\n' "$__c_blue" "$__c_reset" "$__c_bold" "$*" "$__c_reset"; }
log::info()  { printf '  %s%s%s\n' "$__c_dim" "$*" "$__c_reset"; }
log::ok()    { printf '  %s✓%s %s\n' "$__c_green" "$__c_reset" "$*"; }
log::warn()  { printf '  %s!%s %s\n' "$__c_yellow" "$__c_reset" "$*"; }
log::err()   { printf '  %s✗%s %s\n' "$__c_red" "$__c_reset" "$*" >&2; }
log::skip()  { printf '  %s∼ %s%s\n' "$__c_dim" "$*" "$__c_reset"; }
log::title() { printf '\n%s%s%s\n' "$__c_bold" "$*" "$__c_reset"; }
log::rule()  { printf '%s──────────────────────────────────────────────────────%s\n' "$__c_dim" "$__c_reset"; }
