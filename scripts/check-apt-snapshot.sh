#!/bin/sh
# Signed, immutable archive indexes; never silently fall back to today's packages.
set -eu
snapshot="$1"
case "$snapshot" in ????????T??????Z) ;; *) exit 1 ;; esac
# shellcheck source=/dev/null
. /etc/os-release
case "$ID" in
  ubuntu)
    rm -f /etc/apt/sources.list.d/*.sources /etc/apt/sources.list.d/*.list
    printf 'deb [check-valid-until=no] https://snapshot.ubuntu.com/ubuntu/%s/ noble main universe\ndeb [check-valid-until=no] https://snapshot.ubuntu.com/ubuntu/%s/ noble-updates main universe\ndeb [check-valid-until=no] https://snapshot.ubuntu.com/ubuntu/%s/ noble-security main universe\n' "$snapshot" "$snapshot" "$snapshot" > /etc/apt/sources.list
    apt-get -o APT::Update::Error-Mode=any update
    apt-get install -y --no-install-recommends bash curl git jq util-linux shellcheck openssl
    ;;
  debian)
    rm -f /etc/apt/sources.list.d/*.sources /etc/apt/sources.list.d/*.list
    printf 'deb [check-valid-until=no] https://snapshot.debian.org/archive/debian/%s/ bookworm main\ndeb [check-valid-until=no] https://snapshot.debian.org/archive/debian-security/%s/ bookworm-security main\n' "$snapshot" "$snapshot" > /etc/apt/sources.list
    apt-get -o APT::Update::Error-Mode=any update
    apt-get install -y --no-install-recommends ca-certificates nginx-light util-linux tini libxml2 libxslt1.1 libicu72 libpam0g liblz4-1 libzstd1 libreadline8 libldap-2.5-0 libgssapi-krb5-2
    ;;
  *) exit 1 ;;
esac
dpkg-query -W -f='${binary:Package}\t${Version}\n' | LC_ALL=C sort > /opt/clog-toolchain-packages.txt
rm -rf /var/lib/apt/lists/*
