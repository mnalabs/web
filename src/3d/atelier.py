# Rellotge «AT-21» d'Atelier Temps (marca inventada) per a la mostra mostres/atelier-temps.html.
# Es genera amb Blender des de la línia d'ordres:
#   blender -b -P src/3d/atelier.py -- <carpeta de sortida> <mostres> prova            (4 imatges fixes per mirar-ho)
#   blender -b -P src/3d/atelier.py -- <carpeta de sortida> <mostres> sequencia <N>     (N fotogrames del scroll)
#   blender -b -P src/3d/atelier.py -- <carpeta de sortida> <mostres> variants          (esferes × corretges per al configurador)
# Unitats: 1 unitat de Blender = 1 mm. Caixa de 40 mm, eix Z cap a l'esfera, les 12 h a +Y.
# Ordre de baix a dalt: fons de caixa, rotor, ponts, engranatges i volant, platina, esfera, agulles, vidre.
import bpy, bmesh, math, os, sys, json
from mathutils import Vector

args = sys.argv[sys.argv.index('--') + 1:] if '--' in sys.argv else []
SORTIDA = os.path.abspath(args[0] if args else '.')
MOSTRES = int(args[1]) if len(args) > 1 else 48
MODE = args[2] if len(args) > 2 else 'prova'
N_FOTOGRAMES = int(args[3]) if len(args) > 3 and args[3].isdigit() else 120
os.makedirs(SORTIDA, exist_ok=True)
AMPLADA, ALCADA = (1280, 720)

bpy.ops.wm.read_factory_settings(use_empty=True)
escena = bpy.context.scene

def srgb(hexa):
    c = [int(hexa[i:i + 2], 16) / 255 for i in (1, 3, 5)]
    return tuple(x / 12.92 if x <= .04045 else ((x + .055) / 1.055) ** 2.4 for x in c)

# ======================= MATERIALS =======================
def material(nom, color, rugositat=.4, metall=0., **extra):
    m = bpy.data.materials.new(nom); m.use_nodes = True
    p = m.node_tree.nodes['Principled BSDF']
    p.inputs['Base Color'].default_value = (*color, 1)
    p.inputs['Roughness'].default_value = rugositat
    p.inputs['Metallic'].default_value = metall
    for clau, valor in extra.items():
        if clau in p.inputs: p.inputs[clau].default_value = valor
    return m

def amb_relleu(m, node_textura, forca, distancia=.05):
    """Connecta una textura (sortida 'Fac') com a relleu (bump) al material."""
    arbre = m.node_tree; p = arbre.nodes['Principled BSDF']
    bump = arbre.nodes.new('ShaderNodeBump'); bump.inputs['Strength'].default_value = forca; bump.inputs['Distance'].default_value = distancia
    arbre.links.new(node_textura.outputs[0], bump.inputs['Height']); arbre.links.new(bump.outputs['Normal'], p.inputs['Normal'])

ACER_POLIT = material('Acer polit', srgb('#c9ccd2'), .12, 1.)
ACER_SATINAT = material('Acer satinat', srgb('#b4b8bf'), .34, 1.)
OR = material('Or 18 quirats', srgb('#e0b862'), .2, 1.)
LLAO = material('Llautó de la platina', srgb('#c9a965'), .32, 1.)
BLAVEJAT = material('Cargol blavejat', srgb('#1a2a5a'), .25, 1.)
RUBI = material('Rubí', srgb('#d1103a'), .08, 0., **{'Transmission Weight': .6, 'IOR': 1.76})
NEGRE = material('Negre mat', srgb('#0b0b0d'), .5)
CRISTALL = material('Safir', (1, 1, 1), 0., 0., **{'Transmission Weight': 1., 'IOR': 1.77})
CUIR = material('Cuir', srgb('#6b4026'), .55)
COSIT = material('Cosit', srgb('#e8dcc0'), .7)

# Platina amb perlat: petites cel·les (Voronoi) com a relleu
t = LLAO.node_tree.nodes.new('ShaderNodeTexVoronoi'); t.inputs['Scale'].default_value = 5.5; t.feature = 'DISTANCE_TO_EDGE'
tc = LLAO.node_tree.nodes.new('ShaderNodeTexCoord')
LLAO.node_tree.links.new(tc.outputs['Object'], t.inputs['Vector']); amb_relleu(LLAO, t, .5, .08)
# Cuir: gra fi
ruido = CUIR.node_tree.nodes.new('ShaderNodeTexNoise'); ruido.inputs['Scale'].default_value = 40; ruido.inputs['Detail'].default_value = 6
tc2 = CUIR.node_tree.nodes.new('ShaderNodeTexCoord'); CUIR.node_tree.links.new(tc2.outputs['Object'], ruido.inputs['Vector']); amb_relleu(CUIR, ruido, .12, .05)
# Or del rotor: Côtes de Genève (bandes llargues) com a relleu
OR_ROTOR = OR.copy(); OR_ROTOR.name = 'Or del rotor'
ona = OR_ROTOR.node_tree.nodes.new('ShaderNodeTexWave'); ona.wave_type = 'BANDS'; ona.bands_direction = 'X'; ona.inputs['Scale'].default_value = 0.55; ona.inputs['Distortion'].default_value = 0
ona.inputs['Detail'].default_value = 0
tc3 = OR_ROTOR.node_tree.nodes.new('ShaderNodeTexCoord'); OR_ROTOR.node_tree.links.new(tc3.outputs['Object'], ona.inputs['Vector']); amb_relleu(OR_ROTOR, ona, .6, .2)
PONT = ACER_SATINAT.copy(); PONT.name = 'Pont amb Côtes de Genève'
ona2 = PONT.node_tree.nodes.new('ShaderNodeTexWave'); ona2.wave_type = 'BANDS'; ona2.bands_direction = 'X'; ona2.inputs['Scale'].default_value = 0.6; ona2.inputs['Distortion'].default_value = 0
tc4 = PONT.node_tree.nodes.new('ShaderNodeTexCoord'); PONT.node_tree.links.new(tc4.outputs['Object'], ona2.inputs['Vector']); amb_relleu(PONT, ona2, .6, .15)

ESFERES = {  # color del centre, de la vora i de les agulles/índexs
    'blau':  ('#3a58b4', '#0e1a44', '#e8eaf0'),
    'negre': ('#34363f', '#0a0a0d', '#e8eaf0'),
    'crema': ('#f0e8d2', '#c9bd9c', '#2a2418'),
}

def material_esfera(clau):
    centre, vora, _ = ESFERES[clau]
    m = material('Esfera ' + clau, srgb(centre), .34, .75)
    arbre = m.node_tree; p = arbre.nodes['Principled BSDF']
    coord = arbre.nodes.new('ShaderNodeTexCoord'); sep = arbre.nodes.new('ShaderNodeSeparateXYZ'); arbre.links.new(coord.outputs['Object'], sep.inputs[0])
    # color: degradat radial (més clar al centre)
    dist = arbre.nodes.new('ShaderNodeVectorMath'); dist.operation = 'LENGTH'; arbre.links.new(coord.outputs['Object'], dist.inputs[0])
    rampa = arbre.nodes.new('ShaderNodeValToRGB'); rampa.color_ramp.elements[0].color = (*srgb(centre), 1); rampa.color_ramp.elements[1].color = (*srgb(vora), 1)
    rampa.color_ramp.elements[0].position = .0; rampa.color_ramp.elements[1].position = 1.0
    mapa = arbre.nodes.new('ShaderNodeMapRange'); mapa.inputs['From Min'].default_value = 0; mapa.inputs['From Max'].default_value = 18
    arbre.links.new(dist.outputs['Value'], mapa.inputs['Value']); arbre.links.new(mapa.outputs['Result'], rampa.inputs['Fac'])
    arbre.links.new(rampa.outputs['Color'], p.inputs['Base Color'])
    # raigs de sol: relleu que depèn de l'angle
    ang = arbre.nodes.new('ShaderNodeMath'); ang.operation = 'ARCTAN2'; arbre.links.new(sep.outputs['Y'], ang.inputs[0]); arbre.links.new(sep.outputs['X'], ang.inputs[1])
    mult = arbre.nodes.new('ShaderNodeMath'); mult.operation = 'MULTIPLY'; mult.inputs[1].default_value = 80.
    arbre.links.new(ang.outputs[0], mult.inputs[0])
    sinus = arbre.nodes.new('ShaderNodeMath'); sinus.operation = 'SINE'; arbre.links.new(mult.outputs[0], sinus.inputs[0])
    bump = arbre.nodes.new('ShaderNodeBump'); bump.inputs['Strength'].default_value = .12; bump.inputs['Distance'].default_value = .02
    arbre.links.new(sinus.outputs[0], bump.inputs['Height']); arbre.links.new(bump.outputs['Normal'], p.inputs['Normal'])
    return m

MAT_ESFERA = {k: material_esfera(k) for k in ESFERES}
MAT_INDEX = {k: material('Índexs ' + k, srgb(v[2]), .15, 1. if k != 'crema' else 0.) for k, v in ESFERES.items()}
CORRETGES = {'marro': '#6b4026', 'negre': '#1b1a1a', 'blau': '#1d2a48', 'verd': '#2f4a36'}

# ======================= GEOMETRIA =======================
grups = {}
def grup(nom):
    o = bpy.data.objects.new(nom, None); escena.collection.objects.link(o); grups[nom] = o; return o

def objecte_de_malla(nom, bm, mat, pare, suau=True, bisell=0.):
    malla = bpy.data.meshes.new(nom); bm.to_mesh(malla); bm.free()
    o = bpy.data.objects.new(nom, malla); escena.collection.objects.link(o)
    o.parent = pare; o.data.materials.append(mat)
    if suau:
        for p in malla.polygons: p.use_smooth = True
        try:   # Blender 4.0: superfície llisa amb les arestes vives (més de 35°) marcades
            malla.use_auto_smooth = True; malla.auto_smooth_angle = math.radians(35)
        except AttributeError: pass
    if bisell:
        b = o.modifiers.new('Bisell', 'BEVEL'); b.width = bisell; b.segments = 3; b.limit_method = 'ANGLE'; b.angle_limit = math.radians(35)
    return o

def torn(nom, perfil, mat, pare, passos=96, tancat=True, bisell=0.):
    """Gira un perfil [(radi, z), ...] al voltant de l'eix Z."""
    bm = bmesh.new()
    vs = [bm.verts.new((r, 0, z)) for r, z in perfil]
    ar = [bm.edges.new((vs[i], vs[i + 1])) for i in range(len(vs) - 1)]
    if tancat: ar.append(bm.edges.new((vs[-1], vs[0])))
    bmesh.ops.spin(bm, geom=list(bm.verts) + list(bm.edges), cent=(0, 0, 0), axis=(0, 0, 1), angle=2 * math.pi, steps=passos)
    bmesh.ops.remove_doubles(bm, verts=bm.verts, dist=1e-4)
    bmesh.ops.recalc_face_normals(bm, faces=bm.faces)
    return objecte_de_malla(nom, bm, mat, pare, bisell=bisell)

def prisma(nom, poligon, z0, z1, mat, pare, bisell=0.):
    """Extrudeix un polígon 2D [(x, y), ...] entre z0 i z1."""
    bm = bmesh.new()
    vs = [bm.verts.new((x, y, z0)) for x, y in poligon]
    cara = bm.faces.new(vs)
    res = bmesh.ops.extrude_face_region(bm, geom=[cara])
    nous = [e for e in res['geom'] if isinstance(e, bmesh.types.BMVert)]
    bmesh.ops.translate(bm, vec=(0, 0, z1 - z0), verts=nous)
    bmesh.ops.recalc_face_normals(bm, faces=bm.faces)
    return objecte_de_malla(nom, bm, mat, pare, suau=False, bisell=bisell)

def prisma_en(bm, poligon, z0, z1, rot=0., centre=(0, 0)):
    """Com prisma(), però afegeix la peça a una malla comuna (per a molts objectes petits)."""
    c, s = math.cos(rot), math.sin(rot)
    vs = [bm.verts.new((centre[0] + x * c - y * s, centre[1] + x * s + y * c, z0)) for x, y in poligon]
    cara = bm.faces.new(vs)
    res = bmesh.ops.extrude_face_region(bm, geom=[cara])
    nous = [e for e in res['geom'] if isinstance(e, bmesh.types.BMVert)]
    bmesh.ops.translate(bm, vec=(0, 0, z1 - z0), verts=nous)

def rectangle(w, h): return [(-w / 2, -h / 2), (w / 2, -h / 2), (w / 2, h / 2), (-w / 2, h / 2)]

def cercle(r, n=48): return [(r * math.cos(2 * math.pi * i / n), r * math.sin(2 * math.pi * i / n)) for i in range(n)]

def engranatge(dents, r_ext, r_int, fase=0.):
    pts = []
    for i in range(dents):
        a = fase + 2 * math.pi * i / dents; da = 2 * math.pi / dents
        for k, (f, r) in enumerate([(0, r_int), (.18, r_int), (.3, r_ext), (.55, r_ext), (.67, r_int)]):
            pts.append((r * math.cos(a + f * da), r * math.sin(a + f * da)))
    return pts

def sector(r0, r1, a0, a1, n=24):
    ext = [(r1 * math.cos(a0 + (a1 - a0) * i / n), r1 * math.sin(a0 + (a1 - a0) * i / n)) for i in range(n + 1)]
    inte = [(r0 * math.cos(a1 - (a1 - a0) * i / n), r0 * math.sin(a1 - (a1 - a0) * i / n)) for i in range(n + 1)]
    return ext + inte

def esfera_en(nom, centre, radi, mat, pare, escala_z=1.):
    bm = bmesh.new(); bmesh.ops.create_uvsphere(bm, u_segments=24, v_segments=12, radius=radi)
    bmesh.ops.translate(bm, vec=centre, verts=bm.verts)
    for v in bm.verts: v.co.z = centre[2] + (v.co.z - centre[2]) * escala_z
    return objecte_de_malla(nom, bm, mat, pare)

# --------------- peces (cada una penja d'un buit que es pot moure) ---------------
P = {n: grup(n) for n in ['fons', 'rotor', 'ponts', 'pont_volant', 'engranatges', 'platina', 'esfera', 'hora', 'minut', 'segons', 'vidre', 'caixa', 'corona', 'corretja_dalt', 'corretja_baix']}

# ---- fons de caixa: anell d'acer amb vidre de safir i cargols (z 0 a 1,5)
torn('Anell del fons', [(14.6, 0), (19.6, 0), (19.9, .3), (19.9, 1.5), (14.6, 1.5), (14.3, 1.2), (14.3, .3)], ACER_SATINAT, P['fons'], bisell=.05)
torn('Safir del fons', [(0, .35), (14.4, .35), (14.4, 1.25), (0, 1.25)], CRISTALL, P['fons'])
bm = bmesh.new()
for i in range(8):
    a = 2 * math.pi * (i + .5) / 8
    prisma_en(bm, cercle(.55, 16), 0, -.12, centre=(17.2 * math.cos(a), 17.2 * math.sin(a)))
objecte_de_malla('Cargols del fons', bm, ACER_POLIT, P['fons'])

# ---- rotor d'or (mitja lluna) amb coixinet central (z 2,0 a 2,8)
poli = sector(2.2, 15.6, 0.05, math.pi - 0.05, 40)
prisma('Rotor', poli, 2.0, 2.8, OR_ROTOR, P['rotor'], bisell=.06)
torn('Coixinet del rotor', [(0, 2.0), (2.3, 2.0), (2.3, 2.8), (1.4, 3.2), (0, 3.2)], ACER_POLIT, P['rotor'])
bm = bmesh.new()
for x, y in [(-8.5, 6.0), (8.5, 6.0), (0, 11.5)]:
    prisma_en(bm, cercle(.35, 12), 2.8, 2.9, centre=(x, y))
objecte_de_malla('Cargols del rotor', bm, ACER_POLIT, P['rotor'])

# ---- ponts (z 3,0 a 3,6)
def pont(nom, poligon):
    return prisma(nom, poligon, 3.0, 3.6, PONT, P['ponts'], bisell=.05)
pont('Pont del barret', sector(5.5, 13.5, math.radians(95), math.radians(205), 30))
pont('Pont del tren', sector(2.0, 11.0, math.radians(-35), math.radians(80), 30))
pont('Pont de la sortida', [(-9.8, -4.4), (-3.6, -2.6), (-1.4, -6.4), (-3.2, -9.2), (-8.6, -9.0)])
# el pont del volant (separat perquè s'aixequi): arc obert que deixa veure el volant
P_VOLANT = (4.2, -7.8)
poli = sector(5.3, 7.6, math.radians(-150), math.radians(20), 30) + []
prisma('Pont del volant', [(x + P_VOLANT[0], y + P_VOLANT[1]) for x, y in poli], 3.0, 3.6, PONT, P['pont_volant'], bisell=.05)
prisma('Braç del pont del volant', [(P_VOLANT[0] + 4.99, P_VOLANT[1] + 1.81), (P_VOLANT[0] + 7.14, P_VOLANT[1] + 2.6), (P_VOLANT[0] + 12.0, P_VOLANT[1] + 6.2), (P_VOLANT[0] + 10.2, P_VOLANT[1] + 8.0)], 3.0, 3.6, PONT, P['pont_volant'], bisell=.05)
# cargols blavejats i rubins
bm = bmesh.new()
for x, y in [(-9, 8.5), (-11.5, 2.0), (6.5, 7.8), (9.5, 1.0), (-6.5, -7.3), (-3.0, -3.6), (13.0, -6.4), (-1.0, 6.4)]:
    prisma_en(bm, cercle(.62, 20), 3.6, 3.78, centre=(x, y))
objecte_de_malla('Cargols blavejats', bm, BLAVEJAT, P['ponts'])
for i, (x, y) in enumerate([(-8.0, 5.0), (3.4, 4.0), (-5.5, -6.0), (7.5, -1.0)]):
    esfera_en(f'Rubí {i}', (x, y, 3.7), .55, RUBI, P['ponts'], .55)
    torn(f'Engast {i}', [(.9, 3.6), (1.1, 3.6), (1.1, 3.85), (.9, 3.85)], OR, P['ponts'], passos=24).location = (x, y, 0)
P_VOLANT_RUBI = esfera_en('Rubí del volant', (P_VOLANT[0], P_VOLANT[1], 3.7), .6, RUBI, P['pont_volant'], .55)

# ---- engranatges i volant (z 3,8 a 4,4)
def roda(nom, centre, dents, r_ext, r_int, mat, z0=3.85, z1=4.25, fase=0.):
    o = prisma(nom, engranatge(dents, r_ext, r_int, fase), z0, z1, mat, P['engranatges'], bisell=.03)
    o.location = (centre[0], centre[1], 0)
    return o
roda('Barret', (-8.4, 3.0), 44, 5.6, 5.0, OR)
roda('Roda central', (0, 0), 20, 3.4, 2.9, ACER_POLIT)
roda('Roda del tren', (4.6, 5.0), 16, 2.9, 2.4, ACER_POLIT)
roda('Roda dels segons', (-3.2, 7.4), 14, 2.3, 1.9, LLAO)
roda("Roda d'escapament", (-3.6, -6.2), 15, 2.5, 1.7, ACER_POLIT)
# àncora i forquilla
prisma('Àncora', [(-1.5, -3.6), (2.9, -4.6), (3.6, -6.2), (2.6, -7.0), (1.2, -5.6), (-1.0, -4.8)], 3.9, 4.15, ACER_POLIT, P['engranatges'], bisell=.03)
# volant: anell amb 4 radis, espiral i eix
VX, VY = P_VOLANT
anell = torn('Anell del volant', [(4.3, 3.95), (4.9, 3.95), (4.9, 4.6), (4.3, 4.6)], OR, P['engranatges'], passos=64)
anell.location = (VX, VY, 0)
bm = bmesh.new()
for k in range(4):
    a = math.pi / 4 + k * math.pi / 2
    prisma_en(bm, rectangle(4.4, .35), 4.15, 4.4, rot=a, centre=(VX + 2.2 * math.cos(a), VY + 2.2 * math.sin(a)))
objecte_de_malla('Radis del volant', bm, OR, P['engranatges'], suau=False)
esp = bpy.data.curves.new('Espiral', 'CURVE'); esp.dimensions = '3D'
sp = esp.splines.new('POLY'); sp.points.add(220)
for i, pnt in enumerate(sp.points):
    f = i / 220; r = .5 + f * 3.4; a = f * 2 * math.pi * 7
    pnt.co = (VX + r * math.cos(a), VY + r * math.sin(a), 4.2 + .03 * math.sin(f * 20), 1)
esp.bevel_depth = .045; esp.bevel_resolution = 2
oe = bpy.data.objects.new('Espiral del volant', esp); escena.collection.objects.link(oe); oe.parent = P['engranatges']; oe.data.materials.append(BLAVEJAT)

# ---- platina de llautó amb perlat (z 4,6 a 5,3)
torn('Platina', [(0, 4.6), (17.3, 4.6), (17.3, 5.3), (0, 5.3)], LLAO, P['platina'], bisell=.04)

# ---- esfera, índexs i textos (z 5,8 a 6,1)
def construeix_esfera(clau):
    mat_i = MAT_INDEX[clau]
    o = torn('Esfera', [(0, 5.8), (17.6, 5.8), (17.6, 6.1), (0, 6.1)], MAT_ESFERA[clau], P['esfera'])
    bm = bmesh.new()
    for h in range(12):
        a = math.pi / 2 - h * math.pi / 6; gran = h % 3 == 0
        l, w, r = (3.8, 1.2, 14.2) if gran else (2.8, .8, 14.6)
        prisma_en(bm, rectangle(w, l), 6.1, 6.55, rot=a - math.pi / 2, centre=(r * math.cos(a), r * math.sin(a)))
    for m in range(60):
        if m % 5 == 0: continue
        a = m * math.pi / 30
        prisma_en(bm, rectangle(.14, .9), 6.1, 6.2, rot=a - math.pi / 2, centre=(16.7 * math.cos(a), 16.7 * math.sin(a)))
    objecte_de_malla('Índexs', bm, mat_i, P['esfera'], suau=False)
    return o

def text(nom, cos, mida, z, centre, mat, pare, font='/usr/share/fonts/truetype/dejavu/DejaVuSerif.ttf', extrusio=.05, rot=0.):
    c = bpy.data.curves.new(nom, 'FONT'); c.body = cos; c.size = mida; c.extrude = extrusio
    c.align_x = 'CENTER'; c.align_y = 'CENTER'
    try: c.font = bpy.data.fonts.load(font)
    except Exception: pass
    o = bpy.data.objects.new(nom, c); escena.collection.objects.link(o); o.parent = pare
    o.location = (centre[0], centre[1], z); o.rotation_euler = (0, 0, rot); o.data.materials.append(mat); return o

# ---- agulles (hora z 6,5; minut 6,9; segons 7,3)
H, M, S = 9 + 10 / 60 + 36 / 3600, 9 + 36 / 60, 36
ang_hora = -((10 + 9.6 / 60) % 12) / 12 * 2 * math.pi
ang_minut = -(9.6 / 60) * 2 * math.pi
ang_segons = -(36 / 60) * 2 * math.pi
def agulla(nom, llarg, ample, z0, z1, mat, pare, angle, cua=2.5, punta=.35):
    pts = [(-ample * .35, -cua), (ample * .5, -cua * .4), (ample * .62, llarg * .25), (ample * .5, llarg * .78), (0, llarg), (-ample * .5, llarg * .78), (-ample * .62, llarg * .25), (-ample * .5, -cua * .4)]
    o = prisma(nom, pts, z0, z1, mat, pare, bisell=.03); pare.rotation_euler = (0, 0, angle); return o
agulla('Agulla de les hores', 9.2, 1.9, 6.5, 6.8, ACER_POLIT, P['hora'], ang_hora)
agulla('Agulla dels minuts', 14.4, 1.5, 6.9, 7.15, ACER_POLIT, P['minut'], ang_minut)
agulla('Agulla dels segons', 16.2, .35, 7.3, 7.42, OR, P['segons'], ang_segons, cua=4.2)
torn('Eix', [(0, 6.4), (.9, 6.4), (.9, 7.6), (.45, 7.8), (0, 7.8)], OR, P['segons'], passos=32)

# ---- vidre de safir i bisell (z 8 a 10)
def arc_vidre(r, z_base, alt, n=24, des=0.):
    return [(r * math.cos(math.pi / 2 * i / n), z_base + alt * math.sin(math.pi / 2 * i / n) + des) for i in range(n + 1)]
ext = arc_vidre(17.9, 8.4, 1.6)
inte = arc_vidre(17.9, 8.4, 1.6, des=-.8)
torn('Vidre de safir', [(r, z) for r, z in ext] + [(r, z) for r, z in reversed(inte)], CRISTALL, P['vidre'])
torn('Bisell', [(17.3, 7.8), (19.5, 7.8), (20.0, 8.4), (19.4, 9.0), (17.6, 9.0), (17.3, 8.5)], ACER_POLIT, P['vidre'], bisell=.05)

# ---- caixa: carrura, cornes, corona i barres (z 1 a 8)
torn('Carrura', [(18.3, 1.0), (20.2, 1.0), (20.3, 1.4), (20.3, 7.4), (19.8, 7.9), (18.3, 7.9)], ACER_SATINAT, P['caixa'], passos=128, bisell=.05)
def corna(x, y, signe):
    pts = [(-2.2, -6.2), (2.2, -6.2), (1.9, 6.2), (-1.9, 6.2)]
    o = prisma('Corna', pts, 1.4, 7.2, ACER_SATINAT, P['caixa'], bisell=.7)
    o.location = (x, y, 0); o.rotation_euler = (0, 0, signe * math.radians(7)); return o
for sx in (-1, 1):
    for sy in (-1, 1):
        corna(sx * 12.2, sy * 20.6, sx * sy)
torn('Barra del dalt', [(0, -10.6), (.6, -10.6), (.6, 10.6), (0, 10.6)], ACER_POLIT, P['caixa'], tancat=True, passos=24).location = (0, 0, 0)
for o in [c for c in P['caixa'].children if c.name == 'Barra del dalt']:
    o.rotation_euler = (0, math.pi / 2, 0); o.location = (0, 22.2, 3.4)
torn('Barra del baix', [(0, -10.6), (.6, -10.6), (.6, 10.6), (0, 10.6)], ACER_POLIT, P['caixa'], tancat=True, passos=24)
for o in [c for c in P['caixa'].children if c.name == 'Barra del baix']:
    o.rotation_euler = (0, math.pi / 2, 0); o.location = (0, -22.2, 3.4)
# corona acanalada
bm = bmesh.new()
prisma_en(bm, engranatge(30, 2.7, 2.35), 0, 3.4)
o = objecte_de_malla('Corona', bm, ACER_SATINAT, P['corona'], bisell=.04)
o.rotation_euler = (0, math.pi / 2, 0); o.location = (20.0, 0, 4.7)
torn('Tapa de la corona', [(0, 0), (1.9, 0), (2.3, .3), (2.3, 1.2), (0, 1.2)], ACER_POLIT, P['corona']).rotation_euler = (0, math.pi / 2, 0)
P['corona'].children[-1].location = (23.4, 0, 4.7)

# ---- corretges (curts: surten del quadre)
def corretja(nom, signe, llarg, pare, forats=False):
    bm = bmesh.new(); seccions = []
    N = 36; ample = 20.0; gruix = 3.2
    for j in range(N + 1):
        f = j / N; y = signe * (22.0 + f * llarg)
        z = 3.4 - 46 * (f ** 1.7) * llarg / 60. * .28
        gir = -signe * 0.0
        pts = []
        for (x, dz) in [(-ample / 2, -gruix / 2), (-ample / 2 + .4, gruix / 2), (ample / 2 - .4, gruix / 2), (ample / 2, -gruix / 2)]:
            pts.append(bm.verts.new((x, y, z + dz)))
        seccions.append(pts)
    for a, b in zip(seccions[:-1], seccions[1:]):
        for i in range(4): bm.faces.new((a[i], a[(i + 1) % 4], b[(i + 1) % 4], b[i]))
    bm.faces.new(seccions[0]); bm.faces.new(list(reversed(seccions[-1])))
    bmesh.ops.recalc_face_normals(bm, faces=bm.faces)
    o = objecte_de_malla(nom, bm, CUIR, pare, bisell=.15)
    # cosit: línies discontínues a les vores de dalt
    bs = bmesh.new()
    for j in range(2, N * 2 - 4):
        f = j / (N * 2); y = signe * (22.0 + f * llarg)
        z = 3.4 - 46 * (f ** 1.7) * llarg / 60. * .28 + gruix / 2 + .02
        for x in (-8.2, 8.2):
            prisma_en(bs, rectangle(.28, .9), z, z + .08, centre=(x, y))
    objecte_de_malla(nom + ' cosit', bs, COSIT, pare, suau=False)
    return o
corretja('Corretja de dalt', 1, 40, P['corretja_dalt'])
corretja('Corretja de baix', -1, 48, P['corretja_baix'])

# ======================= ESCENA: LLUMS I CÀMERA =======================
mon = bpy.data.worlds.new('Estudi'); escena.world = mon; mon.use_nodes = True
arbre = mon.node_tree
fons = arbre.nodes['Background']
coord = arbre.nodes.new('ShaderNodeTexCoord'); sepw = arbre.nodes.new('ShaderNodeSeparateXYZ'); rampaw = arbre.nodes.new('ShaderNodeValToRGB')
arbre.links.new(coord.outputs['Generated'], sepw.inputs[0]); arbre.links.new(sepw.outputs['Z'], rampaw.inputs['Fac'])
rampaw.color_ramp.elements[0].color = (.05, .06, .09, 1); rampaw.color_ramp.elements[0].position = .2
rampaw.color_ramp.elements[1].color = (.55, .6, .72, 1); rampaw.color_ramp.elements[1].position = .9
arbre.links.new(rampaw.outputs['Color'], fons.inputs['Color']); fons.inputs['Strength'].default_value = 1.0

def llum(nom, pos, forca, mida, color=(1, 1, 1), forma='RECTANGLE', ample=None):
    d = bpy.data.lights.new(nom, 'AREA'); d.energy = forca; d.size = mida; d.color = color; d.shape = forma
    if ample: d.size_y = ample
    o = bpy.data.objects.new(nom, d); escena.collection.objects.link(o); o.location = pos
    c = o.constraints.new('TRACK_TO'); c.target = objectiu; c.track_axis = 'TRACK_NEGATIVE_Z'; c.up_axis = 'UP_Y'; return o

objectiu = bpy.data.objects.new('Objectiu', None); escena.collection.objects.link(objectiu)
llum('Caixa de llum principal', (-260, -220, 330), 2.6e6, 220, (1, .97, .92))
llum('Caixa de llum inferior', (200, 160, -330), 2.0e6, 220, (.92, .95, 1))
llum('Contrallum blava', (260, 140, 40), 1.6e6, 90, (.6, .72, 1), ample=260)
llum('Contrallum càlida', (-250, 150, -40), 1.2e6, 80, (1, .85, .62), ample=240)
llum('Tira de dalt', (0, -60, 360), 0.9e6, 300, (1, 1, 1), ample=40)

camera = bpy.data.objects.new('Càmera', bpy.data.cameras.new('Càmera')); escena.collection.objects.link(camera); escena.camera = camera
camera.data.lens = 100; camera.data.sensor_fit = 'HORIZONTAL'
camera.data.clip_start, camera.data.clip_end = 20, 4000

escena.render.engine = 'CYCLES'; escena.cycles.device = 'CPU'; escena.cycles.samples = MOSTRES
escena.cycles.use_adaptive_sampling = True; escena.cycles.adaptive_threshold = .03
escena.cycles.max_bounces = 6; escena.cycles.transparent_max_bounces = 6; escena.cycles.transmission_bounces = 6
escena.cycles.sample_clamp_indirect = 3; escena.cycles.sample_clamp_direct = 12; escena.cycles.caustics_reflective = False; escena.cycles.caustics_refractive = False
try:
    escena.cycles.use_denoising = True; escena.cycles.denoiser = 'OPENIMAGEDENOISE'
except Exception:
    escena.cycles.use_denoising = False
escena.render.film_transparent = True
escena.render.image_settings.file_format = 'PNG'; escena.render.image_settings.color_mode = 'RGBA'
escena.render.resolution_x, escena.render.resolution_y = AMPLADA, ALCADA; escena.render.resolution_percentage = 100
escena.view_settings.view_transform = 'AgX' if 'AgX' in escena.view_settings.bl_rna.properties['view_transform'].enum_items.keys() else 'Filmic'
escena.view_settings.look = 'None'; escena.view_settings.exposure = .1

# ======================= POSES I CÀMERA (guió del scroll) =======================
# Desplaçament de cada peça (dx, dy, dz) en mm, segons la pose. L'estat muntat és zero.
MUNTAT = {n: (0, 0, 0) for n in P}
EXPLOSIONAT = {'fons': (0, 0, -36), 'rotor': (0, 0, -23), 'ponts': (0, 0, -13), 'pont_volant': (0, 0, -7), 'engranatges': (0, 0, -3), 'platina': (0, 0, 3),
               'esfera': (0, 0, 15), 'hora': (0, 0, 25), 'minut': (0, 0, 31), 'segons': (0, 0, 37), 'vidre': (0, 0, 52), 'caixa': (0, 0, 0),
               'corona': (13, 0, 0), 'corretja_dalt': (0, 7, 0), 'corretja_baix': (0, -7, 0)}
COR = {'fons': (0, 0, -150), 'rotor': (60, 0, -110), 'ponts': (0, 0, -80), 'pont_volant': (0, 0, 16), 'engranatges': (0, 0, 0), 'platina': (0, 0, 0),
       'esfera': (0, 0, 120), 'hora': (0, 0, 140), 'minut': (0, 0, 150), 'segons': (0, 0, 160), 'vidre': (0, 0, 190), 'caixa': (0, 0, 110),
       'corona': (60, 0, 110), 'corretja_dalt': (0, 120, 80), 'corretja_baix': (0, -120, 80)}
ROTOR = {'fons': (-110, 0, -50), 'rotor': (0, 0, 0), 'ponts': (0, 0, 0), 'pont_volant': (0, 0, 0), 'engranatges': (0, 0, 0), 'platina': (0, 0, 0),
         'esfera': (0, 0, 120), 'hora': (0, 0, 140), 'minut': (0, 0, 150), 'segons': (0, 0, 160), 'vidre': (0, 0, 190), 'caixa': (0, 0, 110),
         'corona': (60, 0, 110), 'corretja_dalt': (0, 120, 80), 'corretja_baix': (0, -120, 80)}
def barreja(a, b, f): return {n: tuple(a[n][i] + (b[n][i] - a[n][i]) * f for i in range(3)) for n in a}

# (t, pose, (azimut°, elevació°, distància mm, objectiu (x, y, z), obertura f/, desplaçament horitzontal, vertical))
# El desplaçament (shift) mou el rellotge dins del quadre perquè no tapi el text de cada capítol: el text és a l'esquerra → el rellotge a la dreta.
GUIO = [
    (0.00, MUNTAT, (-24, 62, 440, (0, 0, 5), 16, 0, .05)),
    (0.10, MUNTAT, (-16, 55, 420, (0, 0, 5), 16, 0, .05)),
    (0.16, MUNTAT, (-4, 30, 420, (0, 0, 5), 16, -.2, 0)),
    (0.30, MUNTAT, (20, -58, 430, (0, 0, 2), 16, -.22, 0)),
    (0.40, barreja(MUNTAT, EXPLOSIONAT, .3), (32, -34, 470, (0, 0, 0), 16, 0, 0)),
    (0.50, EXPLOSIONAT, (40, 16, 700, (0, 0, 8), 16, 0, -.06)),
    (0.58, EXPLOSIONAT, (34, 22, 690, (0, 0, 8), 16, 0, -.06)),
    (0.66, COR, (14, -46, 230, (VX, VY, 4.4), 4, .2, 0)),
    (0.72, COR, (8, -50, 210, (VX, VY, 4.4), 3.5, .2, 0)),
    (0.80, ROTOR, (-8, -50, 250, (0, 0, 2), 5, -.2, 0)),
    (0.86, ROTOR, (-14, -50, 240, (0, 0, 2), 5, -.2, 0)),
    (0.95, MUNTAT, (-22, 56, 520, (0, 0, 5), 16, 0, 0)),
    (1.00, MUNTAT, (-24, 58, 520, (0, 0, 5), 16, 0, 0)),
]
def suau(x): return x * x * (3 - 2 * x)
def estat(t):
    for (t0, p0, c0), (t1, p1, c1) in zip(GUIO[:-1], GUIO[1:]):
        if t <= t1:
            f = suau(min(1, max(0, (t - t0) / (t1 - t0))))
            pose = barreja(p0, p1, f)
            cam = (c0[0] + (c1[0] - c0[0]) * f, c0[1] + (c1[1] - c0[1]) * f, c0[2] + (c1[2] - c0[2]) * f,
                   tuple(c0[3][i] + (c1[3][i] - c0[3][i]) * f for i in range(3)), c0[4] + (c1[4] - c0[4]) * f,
                   c0[5] + (c1[5] - c0[5]) * f, c0[6] + (c1[6] - c0[6]) * f)
            return pose, cam
    return GUIO[-1][1], GUIO[-1][2]

def aplica(t):
    pose, (az, el, dist, obj, fstop, sx, sy) = estat(t)
    camera.data.shift_x, camera.data.shift_y = sx, sy
    for n, (dx, dy, dz) in pose.items(): P[n].location = (dx, dy, dz)
    a, e = math.radians(az), math.radians(el)
    objectiu.location = Vector(obj)
    dir_ = Vector((math.sin(a) * math.cos(e), -math.cos(a) * math.cos(e), math.sin(e)))
    camera.location = objectiu.location + dir_ * dist
    for c in list(camera.constraints): camera.constraints.remove(c)
    c = camera.constraints.new('TRACK_TO'); c.target = objectiu; c.track_axis = 'TRACK_NEGATIVE_Z'; c.up_axis = 'UP_Y'
    camera.data.dof.use_dof = fstop < 16
    camera.data.dof.focus_distance = dist; camera.data.dof.aperture_fstop = fstop
    bpy.context.view_layer.update()

ANCORES = {  # punt de cada peça on s'enganxa l'etiqueta (mm, coordenades de la peça)
    'vidre': (17.5, 0, 9.4), 'hora': (6, 3, 6.7), 'esfera': (-15.8, 0, 6.0), 'platina': (17.3, -1, 5.0),
    'engranatges': (VX + 4.8, VY, 4.3), 'ponts': (13, 4, 3.3), 'rotor': (-13.8, 5, 2.5), 'fons': (19.5, 0, .8),
}
def posicions_etiquetes():
    sortida = {}
    from bpy_extras.object_utils import world_to_camera_view
    for nom, punt in ANCORES.items():
        mon = Vector(punt) + Vector(P[nom].location)
        u = world_to_camera_view(escena, camera, mon)
        sortida[nom] = [round(u.x, 4), round(1 - u.y, 4)]
    return sortida

def renderitza(nom):
    escena.render.filepath = os.path.join(SORTIDA, nom)
    try:
        bpy.ops.render.render(write_still=True)
    except RuntimeError:
        escena.cycles.use_denoising = False
        bpy.ops.render.render(write_still=True)

def tria_variant(esfera, corretja_clau):
    for o in [c for c in P['esfera'].children]: bpy.data.objects.remove(o)
    construeix_esfera(esfera)
    CUIR.node_tree.nodes['Principled BSDF'].inputs['Base Color'].default_value = (*srgb(CORRETGES[corretja_clau]), 1)

# ---- textos de l'esfera (queden fora de construeix_esfera: depenen del color)
def textos_esfera(clau):
    _, _, tinta = ESFERES[clau]
    m = MAT_INDEX[clau]
    text('Marca', 'Atelier Temps', 2.0, 6.1, (0, 7.2), m, P['esfera'])
    text('Ciutat', 'BARCELONA', .9, 6.1, (0, 4.6), m, P['esfera'], font='/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf')
    text('Calibre', 'AUTOMÀTIC', .85, 6.1, (0, -6.4), m, P['esfera'], font='/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf')
    text('Reserva', '72 H · 31 RUBINS', .65, 6.1, (0, -8.0), m, P['esfera'], font='/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf')

construeix_esfera('blau'); textos_esfera('blau')

# ======================= EXECUCIÓ =======================
if MODE == 'prova':
    for t, nom in [(0.0, 'prova-hero.png'), (0.3, 'prova-darrere.png'), (0.52, 'prova-explosionat.png'), (0.7, 'prova-volant.png'), (0.84, 'prova-rotor.png')]:
        aplica(t); renderitza(nom)
elif MODE == 'temps':   # fotogrames sols, per mirar el guió: ... temps 0.2,0.35,0.6
    for t in [float(x) for x in args[3].split(',')]:
        aplica(t); renderitza(f'temps-{t:.2f}.png')
elif MODE == 'sequencia':
    # args[4] (opcional): trams de t a tornar a renderitzar, p. ex. "0-0.16,0.38-0.66"; la resta es conserva
    trams = [tuple(float(x) for x in t.split('-')) for t in args[4].split(',')] if len(args) > 4 else None
    cami = os.path.join(SORTIDA, 'etiquetes.json')
    etiquetes = json.load(open(cami))['etiquetes'] if trams and os.path.exists(cami) else [None] * N_FOTOGRAMES
    for i in range(N_FOTOGRAMES):
        t = i / (N_FOTOGRAMES - 1)
        if trams and not any(a <= t <= b for a, b in trams): continue
        aplica(t); etiquetes[i] = posicions_etiquetes()
        renderitza(f'f{i:03d}.png')
        print('FOTOGRAMA', i)
    with open(cami, 'w') as f: json.dump({'fotogrames': N_FOTOGRAMES, 'etiquetes': etiquetes}, f)
elif MODE == 'variants':
    aplica(1.0)
    for e in ESFERES:
        for c in CORRETGES:
            tria_variant(e, c); textos_esfera(e); renderitza(f'variant-{e}-{c}.png')
bpy.ops.wm.save_as_mainfile(filepath=os.path.join(SORTIDA, 'atelier.blend'))
print('FET:', SORTIDA)
