shader_type spatial;
render_mode diffuse_burley, specular_schlick_ggx;
uniform vec3 grass_color : source_color = vec3(0.025,0.20,0.055);
uniform float wetness : hint_range(0.0,1.0) = 0.0;
uniform float stripe_scale = 0.095;
void fragment(){
    float stripe = step(0.5, fract(VERTEX.z * stripe_scale));
    ALBEDO = grass_color * mix(0.82,1.12,stripe);
    ROUGHNESS = mix(0.86,0.20,wetness);
    SPECULAR = mix(0.25,0.70,wetness);
}
