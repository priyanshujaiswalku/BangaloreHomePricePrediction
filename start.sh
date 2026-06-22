#!/usr/bin/env bash
# Start script — load artifacts then launch gunicorn
set -e

cd /opt/render/project/src/server
python -c "import util; util.load_saved_artifacts(); print('Artifacts loaded successfully')"
exec gunicorn server:app --bind 0.0.0.0:$PORT --workers 1 --preload
