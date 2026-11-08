from pathlib import Path
import json
root=Path(__file__).parent
required=[
'project.godot','scenes/main.tscn','scripts/card_match.gd','scripts/shootout.gd',
'autoload/league_service.gd','autoload/manager_service.gd','autoload/progression_service.gd',
'shaders/pitch.gdshader','assets/player_base.glb','docs/FINAL_STATUS.md']
for x in required: assert (root/x).exists(),x
proj=(root/'project.godot').read_text()
for autoload in ['GameState','AudioDirector','LeagueService','ManagerService','ProgressionService']: assert autoload+'=' in proj
scene=(root/'scenes/main.tscn').read_text(); assert scene.count('[node name=')>=15
for gd in root.rglob('*.gd'):
 t=gd.read_text(); assert t.count('(')==t.count(')'),gd; assert '\t' not in t,gd
b=(root/'assets/player_base.glb').read_bytes(); assert b[:4]==b'glTF'
pos=root/'data/positions.json'
if pos.exists(): assert len(json.loads(pos.read_text()))>50
print('SMOKE_OK scripts=',len(list(root.rglob('*.gd'))),'positions=',len(json.loads(pos.read_text())) if pos.exists() else 0)
