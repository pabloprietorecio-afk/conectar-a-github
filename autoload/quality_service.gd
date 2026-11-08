extends Node
const PROFILES:={"mobile_low":{"particles":.25,"shadow":1024,"crowd":.2},"mobile_high":{"particles":.65,"shadow":2048,"crowd":.5},"high":{"particles":1.0,"shadow":4096,"crowd":1.0}}
var profile:Dictionary=PROFILES.mobile_high
func select(name:String)->void:profile=PROFILES.get(name,PROFILES.mobile_high)
