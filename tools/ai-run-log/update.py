#!/usr/bin/env python3
"""Update the AI run log data from a Markdown export.

    python3 update.py ai-run-log-2026-11-17.md [more.md ...] [--replace]

Reads the "## Commands" table of each export ("Download as Markdown" on the
local /api/dev-runs page) and merges it into data.js. A command already in
data.js (same date, site and command) is updated, not added twice.
--replace starts from empty instead of merging.
"""
import json, os, re, sys

HERE = os.path.dirname(os.path.abspath(__file__))
DATA = os.path.join(HERE, 'data.js')


def split_row(line):
    # cells are split on "|" that is not escaped as "\|"
    line = line.strip()
    if line.startswith('|'): line = line[1:]
    if line.endswith('|') and not line.endswith('\\|'): line = line[:-1]
    cells, cur, i = [], '', 0
    while i < len(line):
        c = line[i]
        if c == '\\' and i + 1 < len(line):
            cur += line[i + 1]; i += 2; continue
        if c == '|':
            cells.append(cur); cur = ''
        else:
            cur += c
        i += 1
    cells.append(cur)
    return [x.strip().replace('<br>', '\n') for x in cells]


def num(s):
    s = s.replace(',', '').replace('$', '').strip()
    if s in ('', '—', '-'): return None
    try: return float(s) if '.' in s else int(s)
    except ValueError: return None


def parse(md):
    made = re.search(r'\*\*Made:\*\*\s*([0-9-]+ [0-9:]+)', md)
    lines = md.splitlines()
    try: start = next(i for i, l in enumerate(lines) if l.strip() == '## Commands')
    except StopIteration: raise SystemExit('No "## Commands" section found')
    rows = [l for l in lines[start + 1:] if l.strip().startswith('|')]
    if len(rows) < 2: return (made and made.group(1)), []
    head = [h.lower() for h in split_row(rows[0])]
    out = []
    for l in rows[2:]:
        c = dict(zip(head, split_row(l)))
        t = num(c.get('time', '').replace('s', ''))
        out.append({
            'at': c.get('date', ''),
            'site': '' if c.get('site') in ('—', None) else c['site'],
            'agent': c.get('agent', ''),
            'steps': [x.strip() for x in c.get('step', '').split(',') if x.strip() and x.strip() != '—'],
            'models': [x.strip() for x in c.get('model', '').split(',') if x.strip() and x.strip() != '—'],
            'command': c.get('command', ''),
            'ms': round(t * 1000) if t is not None else 0,
            'tokens': num(c.get('tokens', '')) or 0,
            'cost': num(c.get('cost (usd)', '')),
            'credits': num(c.get('credits', '')),
            'result': c.get('result', ''),
        })
    return (made and made.group(1)), out


def load():
    if not os.path.exists(DATA): return {'updated': '', 'runs': []}
    s = open(DATA, encoding='utf-8').read()
    return json.loads(s[s.index('{'):s.rindex('}') + 1])


def main(args):
    files = [a for a in args if not a.startswith('--')]
    if not files: raise SystemExit(__doc__)
    data = {'updated': '', 'runs': []} if '--replace' in args else load()
    key = lambda r: (r['at'], r['site'], r['command'])
    runs = {key(r): r for r in data['runs']}
    added = 0
    for f in files:
        made, rows = parse(open(f, encoding='utf-8').read())
        for r in rows:
            if key(r) not in runs: added += 1
            runs[key(r)] = r
        if made and made > data.get('updated', ''): data['updated'] = made
    data['runs'] = sorted(runs.values(), key=lambda r: r['at'], reverse=True)
    with open(DATA, 'w', encoding='utf-8') as fh:
        fh.write('/* AI run log data. Made by update.py from Markdown exports; do not edit by hand. */\n')
        fh.write('window.RUN_LOG = ' + json.dumps(data, ensure_ascii=False, indent=1) + ';\n')
    print(f"{added} new, {len(data['runs'])} commands in total, updated {data['updated']}")


if __name__ == '__main__':
    main(sys.argv[1:])
