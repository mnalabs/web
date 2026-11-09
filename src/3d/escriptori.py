# Escriptori de feina amb un monitor professional per a «Venda a Amazon» (Què fem, Serveis i Paquets).
# A la pantalla hi va la captura img/exemples-serveis/amazon-pantalla.png (substituïble: només cal canviar aquest fitxer i tornar a renderitzar).
#   blender -b -P src/3d/escriptori.py -- <carpeta de sortida> <mostres>
# Unitats: 1 unitat = 1 cm. Fons transparent: només es veuen l'escriptori i les ombres.
import bpy, bmesh, math, os, sys
from mathutils import Vector

args = sys.argv[sys.argv.index('--') + 1:] if '--' in sys.argv else []
SORTIDA = os.path.abspath(args[0] if args else '.')
MOSTRES = int(args[1]) if len(args) > 1 else 96
PANTALLA = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..', 'img', 'exemples-serveis', 'amazon-pantalla.png'))
os.makedirs(SORTIDA, exist_ok=True)
bpy.ops.wm.read_factory_settings(use_empty=True)
escena = bpy.context.scene

def srgb(h):
    c = [int(h[i:i + 2], 16) / 255 for i in (1, 3, 5)]
    return tuple(x / 12.92 if x <= .04045 else ((x + .055) / 1.055) ** 2.4 for x in c)

def material(nom, color, rug=.4, metall=0., **extra):
    m = bpy.data.materials.new(nom); m.use_nodes = True
    p = m.node_tree.nodes['Principled BSDF']
    p.inputs['Base Color'].default_value = (*color, 1); p.inputs['Roughness'].default_value = rug; p.inputs['Metallic'].default_value = metall
    for k, v in extra.items():
        if k in p.inputs: p.inputs[k].default_value = v
    return m

FUSTA = material('Fusta de roure', srgb('#c9a57a'), .55)
ona = FUSTA.node_tree.nodes.new('ShaderNodeTexWave'); ona.wave_type = 'BANDS'; ona.inputs['Scale'].default_value = 1.1; ona.inputs['Distortion'].default_value = 9; ona.inputs['Detail'].default_value = 4
rampa = FUSTA.node_tree.nodes.new('ShaderNodeValToRGB'); rampa.color_ramp.elements[0].color = (*srgb('#b98f60'), 1); rampa.color_ramp.elements[1].color = (*srgb('#d9b88a'), 1)
tc = FUSTA.node_tree.nodes.new('ShaderNodeTexCoord'); FUSTA.node_tree.links.new(tc.outputs['Object'], ona.inputs['Vector'])
FUSTA.node_tree.links.new(ona.outputs['Color'], rampa.inputs['Fac']); FUSTA.node_tree.links.new(rampa.outputs['Color'], FUSTA.node_tree.nodes['Principled BSDF'].inputs['Base Color'])
ALUMINI = material('Alumini', srgb('#c8cbd0'), .3, 1.)
NEGRE = material('Negre del marc', srgb('#0c0c0e'), .35)
TECLES = material('Tecles', srgb('#f2f2f4'), .45)
CARCASSA = material('Teclat', srgb('#d6d8dc'), .4, .3)
CARTRO = material('Cartró', srgb('#b98c55'), .85)
CINTA = material('Cinta', srgb('#d8c9a8'), .35)
CERAMICA = material('Tassa', srgb('#f4f1ea'), .25)
CAFE = material('Cafè', srgb('#2a1a10'), .2)

# pantalla: emissió amb la captura
PANT = bpy.data.materials.new('Pantalla'); PANT.use_nodes = True
arbre = PANT.node_tree; arbre.nodes.clear()
sortida = arbre.nodes.new('ShaderNodeOutputMaterial'); emi = arbre.nodes.new('ShaderNodeEmission'); emi.inputs['Strength'].default_value = 1.15
imatge = arbre.nodes.new('ShaderNodeTexImage')
if os.path.exists(PANTALLA): imatge.image = bpy.data.images.load(PANTALLA)
imatge.interpolation = 'Cubic'
arbre.links.new(imatge.outputs['Color'], emi.inputs['Color']); arbre.links.new(emi.outputs[0], sortida.inputs['Surface'])

def objecte(nom, bm, mat, bisell=.0, suau=True):
    malla = bpy.data.meshes.new(nom); bm.to_mesh(malla); bm.free()
    o = bpy.data.objects.new(nom, malla); escena.collection.objects.link(o); o.data.materials.append(mat)
    if suau:
        for p in malla.polygons: p.use_smooth = True
        try: malla.use_auto_smooth = True; malla.auto_smooth_angle = math.radians(40)
        except AttributeError: pass
    if bisell:
        b = o.modifiers.new('Bisell', 'BEVEL'); b.width = bisell; b.segments = 4; b.limit_method = 'ANGLE'
    return o

def caixa(nom, mida, pos, mat, bisell=.0, rot=(0, 0, 0)):
    bm = bmesh.new(); bmesh.ops.create_cube(bm, size=1)
    for v in bm.verts: v.co.x *= mida[0]; v.co.y *= mida[1]; v.co.z *= mida[2]
    o = objecte(nom, bm, mat, bisell, suau=False); o.location = pos; o.rotation_euler = rot; return o

def cilindre(nom, radi, alt, pos, mat, seg=48):
    bm = bmesh.new(); bmesh.ops.create_cone(bm, cap_ends=True, segments=seg, radius1=radi, radius2=radi, depth=alt)
    o = objecte(nom, bm, mat, .1); o.location = pos; return o

# --- escriptori de fusta (una llosa amb els cantons arrodonits)
caixa('Escriptori', (120, 62, 3.2), (0, 0, -1.6), FUSTA, bisell=.5)
# --- monitor de 27": marc negre prim, pantalla, peu d'alumini
Y_MON = 12
caixa('Panell', (61.4, 1.1, 36.0), (0, Y_MON, 26), NEGRE, bisell=.35)
pant = bpy.data.objects.new('Pantalla', bpy.data.meshes.new('Pantalla')); escena.collection.objects.link(pant)
bm = bmesh.new()
a, b = 60.0 / 2, 33.75 / 2
vs = [bm.verts.new(p) for p in [(-a, 0, -b), (a, 0, -b), (a, 0, b), (-a, 0, b)]]
cara = bm.faces.new(vs); uv = bm.loops.layers.uv.new()
for l, uvc in zip(cara.loops, [(0, 0), (1, 0), (1, 1), (0, 1)]): l[uv].uv = uvc
bm.to_mesh(pant.data); bm.free(); pant.data.materials.append(PANT)
pant.location = (0, Y_MON - .58, 26)   # el pla ja és vertical (eix X, Z)
caixa('Coll del peu', (5.0, 1.4, 17), (0, Y_MON + 1.6, 12), ALUMINI, bisell=.5)
caixa('Base del peu', (26, 17, .9), (0, Y_MON + 2.5, .45), ALUMINI, bisell=.4)
# --- teclat i ratolí
caixa('Teclat', (43, 13, 1.3), (-3, -12, .65), CARCASSA, bisell=.4, rot=(math.radians(-3), 0, 0))
bm = bmesh.new()
def tecla(x, y, w):
    c = bmesh.ops.create_cube(bm, size=1)['verts']
    for v in c: v.co.x = v.co.x * w + x; v.co.y = v.co.y * 2.3 + y; v.co.z = v.co.z * .6 + 1.55
for fila in range(4):
    for col in range(14): tecla(-3 - 19.2 + col * 2.95, -12 + 4.5 - fila * 2.55, 2.5)
for x, w in [(-17, 3.4), (-13, 3.4), (-8, 15.5), (3.4, 3.4), (7.3, 3.4)]: tecla(-3 + x + 3, -12 + 4.5 - 4 * 2.55, w)
bmesh.ops.recalc_face_normals(bm, faces=bm.faces)
objecte('Tecles', bm, TECLES, .12, suau=False)
bm = bmesh.new(); bmesh.ops.create_uvsphere(bm, u_segments=32, v_segments=16, radius=1)
for v in bm.verts: v.co.x *= 3.2; v.co.y *= 5.2; v.co.z *= 1.9
o = objecte('Ratolí', bm, CARCASSA); o.location = (28, -11, 1.4)
# --- tassa de cafè i una caixa d'enviament (l'aire de «botiga en línia»)
cilindre('Tassa', 3.7, 8.5, (-36, -8, 4.25), CERAMICA); cilindre('Cafè', 3.3, .2, (-36, -8, 8.3), CAFE)
caixa('Caixa', (22, 17, 14), (42, 6, 7), CARTRO, bisell=.25, rot=(0, 0, math.radians(-14)))
caixa('Cinta', (4.2, 17.2, .15), (42, 6, 14.05), CINTA, rot=(0, 0, math.radians(-14)))
# --- llums, món i càmera
def llum(nom, pos, forca, mida, color=(1, 1, 1)):
    d = bpy.data.lights.new(nom, 'AREA'); d.energy = forca; d.size = mida; d.color = color
    o = bpy.data.objects.new(nom, d); escena.collection.objects.link(o); o.location = pos
    c = o.constraints.new('TRACK_TO'); c.target = centre; c.track_axis = 'TRACK_NEGATIVE_Z'; c.up_axis = 'UP_Y'
centre = bpy.data.objects.new('Centre', None); escena.collection.objects.link(centre); centre.location = (0, 4, 19)
llum('Principal', (-90, -80, 120), 28000, 110, (1, .97, .92)); llum('Reforç', (110, -50, 60), 9000, 90, (.9, .94, 1)); llum('Contrallum', (30, 100, 90), 9000, 80)
mon = bpy.data.worlds.new('Estudi'); escena.world = mon; mon.use_nodes = True
mon.node_tree.nodes['Background'].inputs['Color'].default_value = (.85, .88, .94, 1); mon.node_tree.nodes['Background'].inputs['Strength'].default_value = .5
camera = bpy.data.objects.new('Càmera', bpy.data.cameras.new('Càmera')); escena.collection.objects.link(camera); escena.camera = camera
camera.data.lens = 50; camera.location = (70, -165, 78)
c = camera.constraints.new('TRACK_TO'); c.target = centre; c.track_axis = 'TRACK_NEGATIVE_Z'; c.up_axis = 'UP_Y'
escena.render.engine = 'CYCLES'; escena.cycles.device = 'CPU'; escena.cycles.samples = MOSTRES
escena.cycles.sample_clamp_indirect = 3; escena.cycles.blur_glossy = 1.0; escena.cycles.use_denoising = False
escena.render.film_transparent = True
escena.render.resolution_x, escena.render.resolution_y = 1280, 800
escena.render.image_settings.file_format = 'PNG'; escena.render.image_settings.color_mode = 'RGBA'
escena.view_settings.view_transform = 'AgX' if 'AgX' in escena.view_settings.bl_rna.properties['view_transform'].enum_items.keys() else 'Filmic'
escena.render.filepath = os.path.join(SORTIDA, 'escriptori.png')
bpy.ops.render.render(write_still=True)
bpy.ops.wm.save_as_mainfile(filepath=os.path.join(SORTIDA, 'escriptori.blend'))
print('FET', SORTIDA)
