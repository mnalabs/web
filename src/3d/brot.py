# Model 3D del «Brot», el sensor de reg per a horts que surt a Prototipatge.
# Es genera amb Blender des de la línia d'ordres:
#   blender -b -P src/3d/brot.py -- <carpeta de sortida> [mostres]
#   blender -b -P src/3d/brot.py -- <carpeta de sortida> [mostres] web   (imatges per peça per a la web)
# Desa brot.blend i dues imatges amb fons transparent: el prototip muntat i la vista desmuntada.
# Unitats: 1 unitat de Blender = 1 cm. Mides aproximades a partir del dibuix de la web (7,2 cm de diàmetre).
import bpy, bmesh, math, os, sys

arguments = sys.argv[sys.argv.index('--') + 1:] if '--' in sys.argv else []
SORTIDA = os.path.abspath(arguments[0] if arguments else '.')
MOSTRES = int(arguments[1]) if len(arguments) > 1 else 96
os.makedirs(SORTIDA, exist_ok=True)

# ---------- escena buida ----------
bpy.ops.wm.read_factory_settings(use_empty=True)
escena = bpy.context.scene
escena.unit_settings.system = 'METRIC'

def material(nom, color, rugositat=.5, metall=0.0, emissio=None, forca=0.0, recobriment=0.0):
    m = bpy.data.materials.new(nom)
    m.use_nodes = True
    p = m.node_tree.nodes['Principled BSDF']
    p.inputs['Base Color'].default_value = (*color, 1)
    p.inputs['Roughness'].default_value = rugositat
    p.inputs['Metallic'].default_value = metall
    if 'Coat Weight' in p.inputs:
        p.inputs['Coat Weight'].default_value = recobriment
    if emissio:
        p.inputs['Emission Color'].default_value = (*emissio, 1)
        p.inputs['Emission Strength'].default_value = forca
    return m

def srgb(hexa):
    """Color #rrggbb (sRGB) a lineal, que és el que fa servir Blender."""
    c = [int(hexa[i:i + 2], 16) / 255 for i in (1, 3, 5)]
    return tuple(x / 12.92 if x <= .04045 else ((x + .055) / 1.055) ** 2.4 for x in c)

PLASTIC_BLANC = material('Carcassa PETG', srgb('#eef0f3'), rugositat=.42, recobriment=.15)
PLACA_VERDA = material('Placa', srgb('#1f6f4a'), rugositat=.35, recobriment=.4)
XIP = material('Xip', srgb('#141416'), rugositat=.3)
BLINDATGE = material('Blindatge del mòdul', srgb('#c7c9cc'), rugositat=.28, metall=1)
DAURAT = material('Contactes daurats', srgb('#c9a24a'), rugositat=.25, metall=1)
BATERIA = material('Bateria', srgb('#2b2b2e'), rugositat=.45)
TARONJA = material('Franja de la bateria', srgb('#ff9f0a'), rugositat=.5)
BASE = material('Base', srgb('#2a3a2e'), rugositat=.55)
ACER = material('Sonda d\'acer', srgb('#a9b0aa'), rugositat=.3, metall=1)
LED = material('LED', srgb('#30d158'), rugositat=.2, emissio=srgb('#30d158'), forca=18)

def assigna(objecte, mat):
    objecte.data.materials.clear()
    objecte.data.materials.append(mat)
    return objecte

def suavitza(objecte, angle=40):
    """Superfície llisa, però amb les arestes vives (més de `angle` graus) marcades. Funciona a Blender 4.0 i posteriors."""
    bpy.context.view_layer.objects.active = objecte
    objecte.select_set(True)
    try:
        bpy.ops.object.shade_smooth_by_angle(angle=math.radians(angle))  # Blender 4.1+
    except (AttributeError, RuntimeError):
        bpy.ops.object.shade_smooth()  # Blender 4.0
        objecte.data.use_auto_smooth = True
        objecte.data.auto_smooth_angle = math.radians(angle)
    objecte.select_set(False)

def bisellat(objecte, amplada=.05, segments=3):
    mod = objecte.modifiers.new('Bisell', 'BEVEL')
    mod.width, mod.segments, mod.limit_method = amplada, segments, 'ANGLE'
    return objecte

def grup(nom):
    buit = bpy.data.objects.new(nom, None)
    escena.collection.objects.link(buit)
    return buit

def dins(objecte, pare):
    objecte.parent = pare
    return objecte

# ---------- 1. Carcassa: cilindre curt + cúpula, amb una ranura de tancament i el LED a dalt ----------
carcassa = grup('Carcassa')
bpy.ops.mesh.primitive_cylinder_add(vertices=128, radius=3.6, depth=.8, location=(0, 0, .4))
dins(assigna(bisellat(bpy.context.object, .04), PLASTIC_BLANC), carcassa)
bpy.ops.mesh.primitive_uv_sphere_add(segments=128, ring_count=64, radius=3.6, location=(0, 0, .8))
cupula = bpy.context.object
cupula.scale = (1, 1, .52)
bm = bmesh.new(); bm.from_mesh(cupula.data)
bmesh.ops.delete(bm, geom=[v for v in bm.verts if v.co.z < -1e-4], context='VERTS')
bm.to_mesh(cupula.data); bm.free()
dins(assigna(cupula, PLASTIC_BLANC), carcassa)
bpy.ops.mesh.primitive_torus_add(major_radius=3.61, minor_radius=.025, major_segments=128, location=(0, 0, .55))
dins(assigna(bpy.context.object, BATERIA), carcassa)  # ranura fosca on tanca la carcassa
bpy.ops.mesh.primitive_uv_sphere_add(segments=32, ring_count=16, radius=.22, location=(0, 0, 2.66))
dins(assigna(bpy.context.object, LED), carcassa)
for o in carcassa.children: suavitza(o)

# ---------- 2. Placa: verda, amb el mòdul Wi-Fi, contactes daurats i pistes ----------
placa = grup('Placa')
bpy.ops.mesh.primitive_cube_add(size=1, location=(0, 0, .08)); o = bpy.context.object
o.scale = (6.4, 4.4, .16); dins(assigna(bisellat(o, .03, 2), PLACA_VERDA), placa)
bpy.ops.mesh.primitive_cube_add(size=1, location=(0, .2, .3)); o = bpy.context.object
o.scale = (1.8, 2.4, .28); dins(assigna(bisellat(o, .02, 2), BLINDATGE), placa)  # mòdul ESP32 amb blindatge
bpy.ops.mesh.primitive_cube_add(size=1, location=(0, -1.35, .2)); o = bpy.context.object
o.scale = (1.8, .5, .08); dins(assigna(o, XIP), placa)  # antena del mòdul
for x, y, ample in [(-2.5, 1.4, .9), (2.5, 1.4, .9), (-2.5, -1.4, .6), (2.4, -1.5, 1.0)]:
    bpy.ops.mesh.primitive_cube_add(size=1, location=(x, y, .18)); o = bpy.context.object
    o.scale = (ample, .45, .05); dins(assigna(o, DAURAT), placa)
for x0, x1, y in [(-2.0, -.9, .6), (.9, 2.0, .6), (-2.0, -.9, -.4), (.9, 2.1, -.9)]:
    bpy.ops.mesh.primitive_cube_add(size=1, location=((x0 + x1) / 2, y, .165)); o = bpy.context.object
    o.scale = (x1 - x0, .06, .015); dins(assigna(o, DAURAT), placa)  # pistes
bpy.ops.mesh.primitive_cube_add(size=1, location=(-1.2, -1.6, .26)); o = bpy.context.object
o.scale = (.7, .5, .22); dins(assigna(bisellat(o, .02, 2), XIP), placa)  # sensor
bpy.ops.mesh.primitive_cube_add(size=1, location=(1.6, 1.5, .26)); o = bpy.context.object
o.scale = (.6, .4, .2); dins(assigna(bisellat(o, .02, 2), XIP), placa)  # connector de la bateria

# ---------- 3. Bateria: paquet pla fosc amb la franja taronja i el «+» ----------
bateria = grup('Bateria')
bpy.ops.mesh.primitive_cube_add(size=1, location=(.35, 0, .5)); o = bpy.context.object
o.scale = (4.4, 3.0, 1.0); dins(assigna(bisellat(o, .12, 4), BATERIA), bateria)
bpy.ops.mesh.primitive_cube_add(size=1, location=(-2.15, 0, .5)); o = bpy.context.object
o.scale = (.7, 3.0, 1.0); dins(assigna(bisellat(o, .12, 4), TARONJA), bateria)
for escala in [(.5, .08, .02), (.08, .5, .02)]:
    bpy.ops.mesh.primitive_cube_add(size=1, location=(1.8, 0, 1.01)); o = bpy.context.object
    o.scale = escala; dins(assigna(o, TARONJA), bateria)

# ---------- 4. Base i sonda: base arrodonida per sota i la punta d'acer que es clava a terra ----------
base = grup('Base i sonda')
bpy.ops.mesh.primitive_cylinder_add(vertices=128, radius=3.6, depth=.8, location=(0, 0, 0))
dins(assigna(bisellat(bpy.context.object, .05), BASE), base)
bpy.ops.mesh.primitive_uv_sphere_add(segments=128, ring_count=64, radius=3.6, location=(0, 0, -.4))
fons = bpy.context.object
fons.scale = (1, 1, .3)
bm = bmesh.new(); bm.from_mesh(fons.data)
bmesh.ops.delete(bm, geom=[v for v in bm.verts if v.co.z > 1e-4], context='VERTS')
bm.to_mesh(fons.data); bm.free()
dins(assigna(fons, BASE), base)
bpy.ops.mesh.primitive_cone_add(vertices=64, radius1=.36, radius2=.12, depth=5.2, location=(0, 0, -3.6))
sonda = bpy.context.object
sonda.rotation_euler = (math.pi, 0, 0)  # el radi gran a dalt
dins(assigna(sonda, ACER), base)
for o in base.children: suavitza(o)

PECES = [carcassa, placa, bateria, base]

def col_loca(alcades):
    for peca, z in zip(PECES, alcades):
        peca.location = (0, 0, z)

# ---------- llums d'estudi i càmera ----------
def llum(nom, posicio, forca, mida, color=(1, 1, 1)):
    dades = bpy.data.lights.new(nom, 'AREA')
    dades.energy, dades.size, dades.color = forca, mida, color
    objecte = bpy.data.objects.new(nom, dades)
    escena.collection.objects.link(objecte)
    objecte.location = posicio
    restriccio = objecte.constraints.new('TRACK_TO'); restriccio.target = carcassa
    return objecte

objectiu = grup('Objectiu')
llum('Principal', (-14, -16, 18), 9000, 10)
llum('Farciment', (18, -10, 6), 2600, 12, (.95, .97, 1))
llum('Contrallum', (4, 18, 14), 5000, 8)
mon = bpy.data.worlds.new('Estudi'); escena.world = mon
mon.use_nodes = True
mon.node_tree.nodes['Background'].inputs['Color'].default_value = (.92, .93, .95, 1)
mon.node_tree.nodes['Background'].inputs['Strength'].default_value = .35

camera = bpy.data.objects.new('Càmera', bpy.data.cameras.new('Càmera'))
escena.collection.objects.link(camera)
escena.camera = camera
camera.data.lens = 85
restriccio = camera.constraints.new('TRACK_TO'); restriccio.target = objectiu

# ---------- render ----------
escena.render.engine = 'CYCLES'
escena.cycles.device = 'CPU'
escena.cycles.samples = MOSTRES
escena.cycles.use_adaptive_sampling = True
# el Blender de les distribucions Linux sovint no porta OpenImageDenoise: el fem servir només si hi és
try:
    escena.cycles.use_denoising = True
    escena.cycles.denoiser = 'OPENIMAGEDENOISE'
    bpy.ops.render.render.poll()  # no comprova el denoiser; si no hi és, el render falla i ho desactivem a renderitza()
except Exception:
    escena.cycles.use_denoising = False
escena.cycles.sample_clamp_indirect = 4  # menys punts brillants de soroll
escena.render.film_transparent = True
escena.render.image_settings.file_format = 'PNG'
escena.render.image_settings.color_mode = 'RGBA'
escena.view_settings.view_transform = 'AgX' if 'AgX' in [v for v in escena.view_settings.bl_rna.properties['view_transform'].enum_items.keys()] else 'Filmic'
escena.render.resolution_percentage = 100

def renderitza(nom, amplada, alcada, posicio_camera, mira_a):
    escena.render.resolution_x, escena.render.resolution_y = amplada, alcada
    camera.location = posicio_camera
    objectiu.location = mira_a
    escena.render.filepath = os.path.join(SORTIDA, nom)
    try:
        bpy.ops.render.render(write_still=True)
    except RuntimeError as error:
        if 'OpenImageDenoise' not in str(error):
            raise
        escena.cycles.use_denoising = False  # sense eliminació de soroll: cal pujar les mostres
        bpy.ops.render.render(write_still=True)

if 'web' in arguments[2:]:
    # ---------- MODE WEB: una imatge per peça per a l'animació de Prototipatge ----------
    # Totes amb la mateixa càmera ortogràfica, de manera que encaixen exactament quan es posen una sobre l'altra
    # dins de l'SVG de la web (viewBox 640 × 560). Per a cada peça: el render i l'esbós (només línies, amb Freestyle).
    # També escriu brot-web.json amb on queda cada peça a l'SVG i quant s'ha de desplaçar quan es desmunta.
    import json
    from bpy_extras.object_utils import world_to_camera_view
    from mathutils import Vector

    VIEWBOX = (640, 560)
    NOMS = ['carcassa', 'placa', 'bateria', 'base']
    # peces lleugerament separades (com al dibuix de la web) i quant se separen més en desmuntar-se (cm)
    # (amb 1,6 cm entre peces no se solapen vistes des de la càmera, que mira una mica des de dalt)
    POSICIO = [4.29, 2.25, -.35, -2.35]
    SEPARACIO = [2.2, .8, -.8, -1.8]
    # el producte muntat, tal com es compra: la carcassa encaixada sobre la base; la placa i la bateria, a dins
    MUNTAT = [-1.0, -.85, -.35, -1.4]

    # el LED no brilla al render: la web l'encén al final amb una llum pròpia
    nodes = LED.node_tree.nodes['Principled BSDF']
    nodes.inputs['Emission Strength'].default_value = 0
    nodes.inputs['Base Color'].default_value = (*srgb('#1e6b3a'), 1)

    camera.constraints.clear()
    camera.data.type = 'ORTHO'
    camera.data.ortho_scale = 26          # amplada visible en cm
    camera.data.sensor_fit = 'HORIZONTAL'
    camera.data.shift_x = .035            # la peça una mica a l'esquerra, per deixar lloc a les etiquetes
    elevacio, azimut = math.radians(12), math.radians(-22)
    direccio = Vector((math.sin(azimut) * math.cos(elevacio), -math.cos(azimut) * math.cos(elevacio), math.sin(elevacio)))
    camera.location = Vector((0, 0, -.6)) + direccio * 60
    camera.rotation_euler = (-direccio).to_track_quat('-Z', 'Y').to_euler()
    escena.render.resolution_x, escena.render.resolution_y = VIEWBOX[0] * 2, VIEWBOX[1] * 2

    def a_svg(punt):
        u = world_to_camera_view(escena, camera, Vector(punt))
        return (round(u.x * VIEWBOX[0], 1), round((1 - u.y) * VIEWBOX[1], 1))

    def vertexs_mon(peca):
        bpy.context.view_layer.update()
        punts = []
        for o in peca.children:
            if o.type == 'MESH' and not o.hide_render:
                punts += [o.matrix_world @ v.co for v in o.data.vertices]
        return punts

    col_loca(POSICIO)
    bpy.context.view_layer.update()
    dades = {'viewBox': VIEWBOX, 'peces': {}}
    for peca, nom, separacio in zip(PECES, NOMS, SEPARACIO):
        punts = [a_svg(p) for p in vertexs_mon(peca)]
        xs, ys = [p[0] for p in punts], [p[1] for p in punts]
        origen, desplacada = a_svg(peca.location), a_svg(peca.location + Vector((0, 0, separacio)))
        dades['peces'][nom] = {
            'caixa': [min(xs), min(ys), max(xs), max(ys)],
            'separacio': round(desplacada[1] - origen[1], 1),   # unitats de l'SVG (negatiu = amunt)
        }
    # quant es desplaça cada peça (unitats de l'SVG) per anar de la seva posició a la del producte muntat
    for peca, nom, z_muntat in zip(PECES, NOMS, MUNTAT):
        origen = a_svg(peca.location)
        muntada = a_svg(Vector((peca.location.x, peca.location.y, z_muntat)))
        dades['peces'][nom]['unio'] = round(muntada[1] - origen[1], 1)
    led = [o for o in carcassa.children if o.data.materials and o.data.materials[0] == LED][0]
    col_loca(MUNTAT); bpy.context.view_layer.update()
    dades['led'] = a_svg(led.matrix_world.translation)   # on queda el LED al producte muntat
    col_loca(POSICIO); bpy.context.view_layer.update()

    def nomes(peca):
        for altra in PECES:
            for o in altra.children:
                o.hide_render = altra is not peca

    # renders
    for peca, nom in zip(PECES, NOMS):
        nomes(peca)
        escena.render.filepath = os.path.join(SORTIDA, f'brot-{nom}.png')
        escena.render.use_freestyle = False
        try:
            bpy.ops.render.render(write_still=True)
        except RuntimeError:
            escena.cycles.use_denoising = False
            bpy.ops.render.render(write_still=True)

    # el producte muntat, tal com es compra (la placa i la bateria no es veuen: són a dins)
    col_loca(MUNTAT)
    for peca in PECES:
        for o in peca.children:
            o.hide_render = peca in (placa, bateria)
    escena.render.filepath = os.path.join(SORTIDA, 'brot-producte.png')
    bpy.ops.render.render(write_still=True)
    col_loca(POSICIO)

    # esbossos: tots els materials passen a ser transparents (holdout) i només queden les línies de Freestyle
    transparent = bpy.data.materials.new('Transparent'); transparent.use_nodes = True
    arbre = transparent.node_tree; arbre.nodes.clear()
    sortida_material = arbre.nodes.new('ShaderNodeOutputMaterial')
    arbre.links.new(arbre.nodes.new('ShaderNodeHoldout').outputs[0], sortida_material.inputs['Surface'])
    for peca in PECES:
        for o in peca.children:
            if o.type == 'MESH':
                o.data.materials.clear(); o.data.materials.append(transparent)
    escena.render.use_freestyle = True
    escena.render.line_thickness_mode = 'ABSOLUTE'
    escena.render.line_thickness = 2.6
    capa = escena.view_layers[0]
    capa.use_freestyle = True
    conjunt = capa.freestyle_settings.linesets[0] if capa.freestyle_settings.linesets else capa.freestyle_settings.linesets.new('Línies')
    conjunt.select_by_visibility = True
    conjunt.select_silhouette = conjunt.select_border = conjunt.select_crease = True
    conjunt.select_external_contour = True
    capa.freestyle_settings.crease_angle = math.radians(130)
    if conjunt.linestyle is None:
        conjunt.linestyle = bpy.data.linestyles.new('Esbós')
    conjunt.linestyle.color = srgb('#1d1d1f')
    conjunt.linestyle.thickness = 2.6
    escena.cycles.samples = 8
    for peca, nom in zip(PECES, NOMS):
        nomes(peca)
        escena.render.filepath = os.path.join(SORTIDA, f'brot-{nom}-esbos.png')
        bpy.ops.render.render(write_still=True)

    with open(os.path.join(SORTIDA, 'brot-web.json'), 'w') as fitxer:
        json.dump(dades, fitxer, indent=1)
    print('FET (web):', SORTIDA)
    sys.exit(0)

# muntat: les peces una sobre l'altra (la bateria i la placa queden amagades dins)
col_loca([.4, 1.25, -.05, -.4])
for peca in [placa, bateria]:
    for o in peca.children: o.hide_render = True
renderitza('brot-muntat.png', 1400, 1400, (17, -24, 10), (0, 0, -.6))
for peca in [placa, bateria]:
    for o in peca.children: o.hide_render = False

# desmuntat: com al dibuix de la web, les peces separades en vertical
col_loca([6.2, 3.6, 1.0, -2.6])
renderitza('brot-desmuntat.png', 1200, 1500, (28, -40, 17), (0, 0, -.2))

bpy.ops.wm.save_as_mainfile(filepath=os.path.join(SORTIDA, 'brot.blend'))
print('FET:', SORTIDA)
