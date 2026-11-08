from pathlib import Path
import json,struct
root=Path(__file__).parents[1]
manifest=json.loads((root/'audio/manifest.json').read_text())
assert len(manifest)==75
assert all((root/'audio'/v['file']).exists() and v['bytes']>500 for v in manifest.values())
pos=json.loads((root/'data/positions.json').read_text());assert len(pos)==145
port=json.loads((root/'PORT_MANIFEST.json').read_text());assert port['status']=='in_progress'
for name in ['match_engine_v2.gd','squad_match.gd','fatigue_model.gd','match_simulator.gd']:
 assert (root/'scripts'/name).exists()
print('REGRESSION_STATIC_OK audio=75 players=145')
for name in ['career_service.gd','formation_service.gd','settings_service.gd']: assert (root/'autoload'/name).exists()
assert len(json.loads((root/'data/screens.json').read_text()))>=5
print('CAREER_UI_STATIC_OK')
for name in ['economy_service.gd','challenge_service.gd','market_service.gd','training_service.gd']:assert (root/'autoload'/name).exists()
assert (root/'scenes/app_shell.tscn').exists()
print('MANAGER_ECONOMY_UI_OK')
assert 'run/main_scene="res://scenes/app_shell.tscn"' in (root/'project.godot').read_text()
assert (root/'scripts/presentation_director.gd').exists()
assert (root/'autoload/quality_service.gd').exists()
print('CONNECTED_UI_PRESENTATION_OK')
