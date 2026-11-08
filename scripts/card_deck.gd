class_name CardDeck
extends RefCounted

const POWER := {"C":2,"U":4,"R":6,"E":8,"L":10}
const COMPOSITION := {"pase":5,"carrera":4,"regate":3,"disparo":4,"entrada":4,"persigue":3,"posicion":3,"corte":3,"despeje":3}
const SPECIAL_NAMES := {"pausa":"La Pausa","amarilla":"Tarjeta amarilla","roja":"Tarjeta roja","pase_magistral":"Pase Magistral",
"aficion":"Afición","cansancio":"Cansancio","lesion":"Lesión Leve","entrada_perfecta":"Entrada Perfecta","contraataque":"Contraataque",
"var":"VAR","trebol":"Trébol","gafe":"Gafe","moneda":"Cara o Cruz"}
const CARD_SKILL := {"pase":"PAS","carrera":"VEL","regate":"REG","disparo":"TIR","entrada":"DEF","persigue":"VEL","posicion":"DEF","corte":"DEF","despeje":"FIS"}
var uid:=0
func make_card(type:String,rarity:String)->Dictionary:
 uid+=1; return {"kind":"card","type":type,"name":type.capitalize(),"skill":CARD_SKILL.get(type,"FIS"),"rarity":rarity,"power":POWER.get(rarity,2),"uid":uid}
func make_special(key:String)->Dictionary:
 uid+=1; return {"kind":"special","special":key,"name":SPECIAL_NAMES.get(key,key),"uid":uid}
func build(rng:RandomNumberGenerator)->Array:
 var deck:Array=[]
 var rarities=["C","C","C","U","U","R","E","L"]
 for type in COMPOSITION:
  for i in COMPOSITION[type]: deck.append(make_card(type,rarities[rng.randi_range(0,rarities.size()-1)]))
 for i in 2: deck.append(make_special("pausa"))
 for key in ["pase_magistral","aficion","cansancio","lesion","entrada_perfecta","contraataque","var","trebol","gafe","moneda"]: deck.append(make_special(key))
 deck.shuffle(); return deck
