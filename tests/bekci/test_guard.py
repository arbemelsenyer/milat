# -*- coding: utf-8 -*-
"""Test bench for the PreToolUse shell guard (~/.claude/hooks/guard-shell.sh).

Kept in a file on purpose: the test cases contain the very strings the guard
watches for, so running them from the command line would trigger the guard
itself. Running "python tests/bekci/test_guard.py" does not.

Lives in the REPO (not a temp folder) because an earlier copy was lost when a
session scratchpad went away. The guard itself lives outside the repo, in the
user profile; this bench is its only regression net.
"""

import json
import os
import subprocess
import sys

HOOK = os.path.expanduser("~/.claude/hooks/guard-shell.sh")

DOT_ENV = "." + "env"          # built at runtime, keeps this file's own text quiet
SSH_KEY = "id_" + "rsa"
DROP_TBL = "DR" + "OP TABLE"
TRUNC = "TRUN" + "CATE"
DEL_FROM = "DELE" + "TE FROM"
WIPE = "r" + "m"

MUST_PASS = [
    ("git status --porcelain",                       "4  git status"),
    ("git ls-files --error-unmatch " + DOT_ENV,      "4  git ls-files hedef dosya"),
    ("git check-ignore -v " + DOT_ENV,               "4  git check-ignore"),
    ("cat .gitignore",                               "4  .gitignore okuma"),
    ('grep -n "' + DOT_ENV + '" .gitignore',         "4  .gitignore icinde arama"),
    ("git status; git ls-files " + DOT_ENV,          "4  zincirli guvenli komut"),
    ("npm run build",                                "-  siradan is"),
    ("cat " + DOT_ENV + ".example",                  "4  ornek env dosyasi publik"),
    ("git pull --no-rebase",                         "2  olumsuz bayrak rebase degil"),
    ("git pull --rebase=false origin main",          "2  rebase=false"),
    ('git commit -m "%s hastalar ve %s dist"' % (DROP_TBL, WIPE),
                                                     "1+3 commit mesaji komut degil"),
    ('git commit -q -m "%s ile %s temizligi"' % (TRUNC, WIPE),
                                                     "3  -q -m mesaji"),
    ('git commit -m "%s deneme, %s dosyasi"' % (DEL_FROM, DOT_ENV),
                                                     "3+4 mesajda gizli dosya adi"),
    ("git push origin main",                         "2  duz push"),
    ("git log --oneline -5",                         "-  gecmis okuma"),
    # GECICI TEZGAH ISTISNASI (CLAUDE.md 22)
    (WIPE + " -f tests/gecici/sonda.test.ts",        "1  gecici tezgah dosyasi"),
    (WIPE + " -rf tests/gecici/alt/klasor",          "1  gecici tezgah alt klasoru"),
    (WIPE + " tests/gecici/a.ts tests/gecici/b.ts",  "1  iki gecici dosya"),
    (WIPE + " -f ./tests/gecici/./sonda.test.ts",    "1  gecici (nokta ayiklanir)"),
    (WIPE + " -f C:/Users/ASUS/milat/tests/gecici/x.ts", "1  gecici (mutlak yol)"),
]

MUST_ASK = [
    ("cat " + DOT_ENV,                               "4  icerik okuma"),
    ("type " + DOT_ENV,                              "4  icerik okuma (windows)"),
    ("Get-Content " + DOT_ENV,                       "4  icerik okuma (powershell)"),
    ("git show HEAD:" + DOT_ENV,                     "4  git ile icerik dokme"),
    ("git diff " + DOT_ENV,                          "4  git diff icerik gosterir"),
    ('echo "X=1" >> ' + DOT_ENV,                     "4  icerige yazma"),
    ("cat .gitignore " + DOT_ENV,                    "4  guvenli komuta ilistirme"),
    ("git status && cat " + DOT_ENV,                 "4  zincirde gizli okuma"),
    ('sed -i "s/a/b/" ' + DOT_ENV,                   "4  yerinde duzenleme"),
    ('grep -n "x" ' + DOT_ENV,                       "4  gizli dosyada arama"),
    ("cat ~/.ssh/" + SSH_KEY,                        "4  ssh anahtari"),
    (WIPE + " -rf dist",                             "1  silme komutu"),
    ("Remove-Item -Recurse build",                   "1  silme (powershell)"),
    ('find . -name "*.tmp" -delete',                 "1  find -delete"),
    ('bash -c "%s -rf dist"' % WIPE,                 "1  ic ice silme"),
    ("psql -c '%s hastalar'" % DROP_TBL,             "3  DROP TABLE"),
    ("psql -c '%s akis_olaylari'" % TRUNC,           "3  TRUNCATE"),
    ("psql -c '%s experts'" % DEL_FROM,              "3  DELETE FROM"),
    ("git push --force origin main",                 "2  force push"),
    ("git push --force-with-lease origin main",      "2  force-with-lease"),
    ("git rebase -i main",                           "2  gercek rebase"),
    ("git reset --hard HEAD~1",                      "2  reset --hard"),
    ("git filter-branch --all",                      "2  filter-branch"),
    ('git commit -m "iyi mesaj" && %s -rf dist' % WIPE,
                                                     "1  zincirde silme"),
    # ISTISNA KACAK DENEMELERI: hicbiri gecmemeli
    (WIPE + " -rf tests/gecici",                     "1  klasorun KENDISI istisna degil"),
    (WIPE + " -rf tests/gecici/../../src",           "1  .. ile agactan cikis"),
    (WIPE + " -rf tests/gecici/../kalici",           "1  .. ile kardes klasor"),
    (WIPE + " -f tests/gecici/a.ts src/main.tsx",    "1  biri disarida ise sorulur"),
    (WIPE + " -rf tests/gecicidir/x",                "1  benzer ad, ayni klasor degil"),
    (WIPE + " -rf gecici/x",                         "1  tests/ olmadan"),
    (WIPE + " -rf",                                  "1  operandsiz silme"),
    ('find tests/gecici -name "*.ts" -delete',       "1  find -delete istisna disi"),
    (WIPE + " -f tests/gecici/x " + DOT_ENV,         "1+4 gizli dosya ilistirilmis"),
    # BILINEN SINIR: ayristirici POSIX kipinde calisir, "\" kacis karakteridir;
    # ters boluyle yazilan yol istisnaya girmez ve SORULUR (guvenli yon).
    ("Remove-Item tests" + chr(92) + "gecici" + chr(92) + "x.ts",
                                                     "1  ters bolu istisnaya girmez"),
]


def run(command):
    payload = json.dumps({"tool_name": "Bash", "tool_input": {"command": command}})
    proc = subprocess.run(
        ["bash", HOOK], input=payload, capture_output=True, text=True
    )
    return proc.stdout.strip()


def show(command):
    return command if len(command) <= 46 else command[:43] + "..."


def main():
    failures = []

    print("=" * 78)
    print("ONAYSIZ GECMESI GEREKENLER")
    print("=" * 78)
    for command, label in MUST_PASS:
        out = run(command)
        ok = out == ""
        if not ok:
            failures.append(("GECMELIYDI", command, out))
        print("%-8s %-48s %s" % ("GECTI" if ok else "**HATA**", show(command), label))

    print()
    print("=" * 78)
    print("ONAY SORMASI GEREKENLER")
    print("=" * 78)
    for command, label in MUST_ASK:
        out = run(command)
        ok = out != ""
        if not ok:
            failures.append(("SORMALIYDI", command, out))
        print("%-8s %-48s %s" % ("SORDU" if ok else "**HATA**", show(command), label))

    print()
    print("=" * 78)
    total = len(MUST_PASS) + len(MUST_ASK)
    if failures:
        print("SONUC: %d/%d dogru - %d HATA" % (total - len(failures), total, len(failures)))
        for kind, command, out in failures:
            print("   %s: %s   [cikti: %s]" % (kind, command, out or "bos"))
        sys.exit(1)
    print("SONUC: %d/%d TESTIN HEPSI DOGRU" % (total, total))


if __name__ == "__main__":
    main()
