class_name SpecialResolver
extends RefCounted

static func apply(key:String,owner:int,context:Dictionary,rng:RandomNumberGenerator)->Dictionary:
 var result:Dictionary={"attack_bonus":0,"defense_bonus":0,"force_win":false,"force_loss":false,"fatigue":0.0,"injury":false,"counter":false,"review":false,"declare_first":false,"note":""}
 match key:
  "pausa": result.declare_first=true; result.note="La Pausa obliga al rival a declarar primero"
  "pase_magistral": result.attack_bonus=4; result.note="Pase Magistral"
  "aficion": result.attack_bonus=2; result.defense_bonus=2; result.note="Empuje de la afición"
  "cansancio": result.fatigue=12.0; result.note="Cansancio rival"
  "lesion": result.injury=rng.randf()<.65; result.note="Riesgo de lesión"
  "entrada_perfecta": result.force_win=true; result.note="Entrada perfecta"
  "contraataque": result.counter=true; result.attack_bonus=3; result.note="Contraataque"
  "var": result.review=true; result.note="Revisión VAR"
  "trebol": result.attack_bonus=rng.randi_range(1,4); result.note="Golpe de suerte"
  "gafe": result.defense_bonus=-rng.randi_range(1,4); result.note="Gafe"
  "moneda": result.force_win=rng.randf()<.5; result.force_loss=not result.force_win; result.note="Cara o cruz"
  "amarilla": result.note="Tarjeta amarilla"
  "roja": result.note="Tarjeta roja"
 return result
