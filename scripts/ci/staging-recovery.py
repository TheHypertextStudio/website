"""Bind Studio's staging-only recovery command to retained GitHub artifacts."""

import hashlib
import io
import json
import os
from pathlib import Path, PurePosixPath
import re
import stat
import subprocess
import sys
import zipfile

REPOSITORY = 'TheHypertextStudio/website'
# Retained candidate producers still use v0.1.8; the recovery executor is v0.1.9.
CANDIDATE_TOOLING = '878260def7229cd3df7f752b32e5581230c5db2d'
ACCOUNT = '2500680a3b2b0fe6a011c1c25fed5008'
WORKER = 'hypertext-studio-site-staging'


def require(value, message):
    if not value:
        raise ValueError(message)


def gh(path, binary=False):
    data = subprocess.check_output(['gh', 'api', f'repos/{REPOSITORY}/{path}'])
    return data if binary else json.loads(data)


def retained_bundle(identifier, workflow, artifact_name, output):
    require(re.fullmatch(r'[1-9][0-9]{0,19}-[1-9][0-9]{0,4}', identifier), 'Invalid run-attempt identity')
    run_id, attempt = map(int, identifier.split('-'))
    run = gh(f'actions/runs/{run_id}/attempts/{attempt}')
    require(run['conclusion'] == 'success' and run['head_branch'] == 'main'
            and run['repository']['full_name'] == REPOSITORY
            and run['head_repository']['full_name'] == REPOSITORY
            and run['path'] == workflow and run['run_attempt'] == attempt,
            'Artifact producer is not the successful owner/main workflow')
    subprocess.run(['git', 'merge-base', '--is-ancestor', run['head_sha'], 'HEAD'], check=True)
    artifacts = gh(f'actions/runs/{run_id}/artifacts?per_page=100')
    require(artifacts['total_count'] <= 100, 'Artifact inventory exceeds bound')
    matches = [row for row in artifacts['artifacts'] if row['name'] == artifact_name and not row['expired']]
    require(len(matches) == 1, 'Expected one retained artifact')
    artifact = matches[0]
    require(artifact['size_in_bytes'] <= 8_000_000, 'Artifact exceeds download bound')
    payload = gh(f"actions/artifacts/{artifact['id']}/zip", binary=True)
    require(len(payload) <= 8_000_000 and artifact['digest'] == 'sha256:' + hashlib.sha256(payload).hexdigest(),
            'GitHub artifact digest mismatch')
    with zipfile.ZipFile(io.BytesIO(payload)) as archive:
        rows = archive.infolist()
        require(len(rows) <= 20 and sum(row.file_size for row in rows) <= 20_000_000,
                'Artifact contents exceed bound')
        names = set()
        for row in rows:
            path = PurePosixPath(row.filename)
            require(not path.is_absolute() and '..' not in path.parts and '\\' not in row.filename
                    and row.filename not in names and not stat.S_ISLNK(row.external_attr >> 16),
                    'Artifact contains unsafe paths')
            names.add(row.filename)
        archive.extractall(output)
    return run


def main():
    sys.path.insert(0, os.environ['STUDIO_ENGINE'])
    from studio.candidate import load_candidate
    from studio.config import load_config

    action = os.environ['RECOVERY_ACTION']
    require(action in {'capture', 'restore'}, 'Only capture or restore is supported')
    require(os.environ['GITHUB_REPOSITORY'] == REPOSITORY and os.environ['GITHUB_REF'] == 'refs/heads/main',
            'Recovery is owner/main only')
    config = load_config(Path('studio.yaml'))
    component = next(row for row in config.components if row['id'] == 'website')
    current = json.loads(Path('wrangler.site.json').read_text())
    require(component['deploy']['account_id'] == ACCOUNT and current['account_id'] == ACCOUNT
            and current['env']['staging']['name'] == WORKER, 'Unexpected staging identity')
    output = Path('.studio/staging-recovery')
    output.mkdir(parents=True, exist_ok=False)
    identifier = os.environ['CANDIDATE_ID']
    bundle = Path(os.environ['RUNNER_TEMP']) / 'recovery-candidate'
    run = retained_bundle(identifier, '.github/workflows/candidate.yml', 'candidate-' + identifier, bundle)
    candidate = load_candidate(bundle / 'candidate.json', expected_product='website',
                               expected_repository=REPOSITORY, expected_tooling_revision=CANDIDATE_TOOLING,
                               expected_digest=os.environ['MANIFEST_SHA256'])
    require(candidate.data['id'] == identifier and candidate.data['source_sha'] == run['head_sha']
            and candidate.data['trigger_event'] == 'push'
            and candidate.data['workflow_run_id'] == run['id']
            and candidate.data['workflow_run_attempt'] == run['run_attempt'], 'Candidate provenance mismatch')
    artifacts = [row for row in candidate.data['artifacts'] if row['component'] == 'website' and row['channel'] == 'web']
    require(len(artifacts) == 1, 'Expected one shipping website archive')
    arguments = [sys.executable, os.environ['STUDIO_ENGINE'], '--root', str(Path.cwd()),
                 'site', 'recovery', action, '--component', 'website', '--env', 'staging',
                 '--record', str(output / 'stage.json')]
    if action == 'capture':
        arguments.extend(['--archive', str(bundle / artifacts[0]['path']),
                          '--worker-config', str(bundle / 'wrangler.site.json')])
    else:
        recovery = os.environ['RECOVERY_ID']
        retained_bundle(recovery, '.github/workflows/staging-recovery.yml', 'staging-recovery-' + recovery, output)
        record_path = output / 'stage.json'
        require(hashlib.sha256(record_path.read_bytes()).hexdigest() == os.environ['RECORD_SHA256'],
                'Recovery record file checksum mismatch')
        record = json.loads(record_path.read_text())
        require(record['worker'] == WORKER and record['account_id'] == ACCOUNT
                and record['logical_environment'] == 'staging'
                and record['artifact_sha256'] == artifacts[0]['sha256'], 'Recovery target differs from candidate')
        confirmation = ':'.join(['restore', ACCOUNT, WORKER, 'staging', record['service_environment'],
                                 record['prior_version_id'], record['record_sha256']])
        arguments.extend(['--expected-current-version', os.environ['EXPECTED_VERSION'],
                          '--expected-current-routing-sha256', os.environ['EXPECTED_ROUTING_SHA256'],
                          '--confirm', confirmation])
    subprocess.run(arguments, check=True)


if __name__ == '__main__':
    main()
