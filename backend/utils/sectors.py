#Safe the sector for each track in a dictonary
sector_dict = {
    'British Grand Prix': [0,350,800,1150,1830,2300,2930,3170,3600,4200,4900,5130,5400,5650],
    'Italian Grand Prix': [0,800,1050,2050,2300,2700,2950,3850,4200,5000,5500],
    'Austrian Grand Prix': [0,330,500,1300,1450,2100,2250,2600,3100,3600,4020],
    'Spanish Grand Prix': [0,750,1250,1600,1870,2000,2200,2450,2600,2800,3000,3370,3900,4400],
    'Bahrain Grand Prix': [0,600,850,1450,1600,1800,2150,2300,2600,2750,3350,3900,4200,4790,5000],
    'Abu Dhabi Grand Prix': [0,275,700,1300,1520,2550,2750,3550,4000,4250,4375,4700,5100],
    'Japanese Grand Prix': [0,700,900,2000,2200,2350,2450,2800,3000,3700,3975,5300,5600,5800],
    'São Paulo Grand Prix': [0,300,550,1300,1470,1875,2200,2500,2750,3100,3270,4309],
    'Belgian Grand Prix': [0,270,450,950,1320,2330,2700,2900,3200,3350,3720,4050,4350,5300,6600,6820,7004],
    'Monaco Grand Prix': [0,150,240,650,820,910,1050,1450,2000,2130,2300,2600,2775,3000,3337],
    "United States Grand Prix": [0,450,700,1100,1450,2020,2460,2700,3600,3800,4350,4850,5515]
}

labels_USA = {
    1: 'Straight',
    2: 'Slow',
    3: 'Straight',
    4: 'Fast',
    5: 'Medium',
    6: 'Straight',
    7: 'Slow',
    8: 'Straight',
    9: 'Slow',
    10: 'Medium',
    11: 'Fast',
    12: 'Medium'
}

labels_monaco = {
    1: 'Straight',
    2: 'Medium',
    3: 'Straight',
    4: 'Fast',
    5: 'Medium',
    6: 'Straight',
    7: 'Slow',
    8: 'Straight',
    9: 'Slow',
    10: 'Straight',
    11: 'Fast',
    12: 'Medium',
    13: 'Slow',
    14: 'Straight'
}

labels_belgium = {
    1: 'Straight',
    2: 'Slow',
    3: 'Straight',
    4: 'Fast',
    5: 'Straight',
    6: 'Medium',
    7: 'Straight',
    8: 'Slow',
    9: 'Medium',
    10: 'Straight',
    11: 'Fast',
    12: 'Straight',
    13: 'Medium',
    14: 'Straight',
    15: 'Slow',
    16: 'Straight'
}

labels_brazil = {
    1: 'Straight',
    2: 'Medium',
    3: 'Straight',
    4: 'Medium',
    5: 'Straight',
    6: 'Fast',
    7: 'Slow',
    8: 'Slow',
    9: 'Fast',
    10: 'Medium',
    11: 'Straight'
}

labels_japan = {
    1: "Straight",
    2: "Medium",
    3: "Fast",
    4: "Straight",
    5: "Fast",
    6: "Medium",
    7: "Straight",
    8: "Slow",
    9: "Straight",
    10: "Medium",
    11: "Straight",
    12: "Slow",
    13: "Straight"
}

labels_spanish = {
    1: 'Straight',
    2: 'Fast',
    3: 'Straight',
    4: 'Medium',
    5: 'Straight',
    6: 'Medium',
    7: 'Straight',
    8: 'Fast',
    9: 'Straight',
    10: 'Fast',
    11: 'Straight',
    12: 'Medium',
    13: 'Slow',
    14: 'Straight'
}

labels_britian = {
    1: 'Straight',
    2: 'Fast',
    3: 'Slow',
    4: 'Straight',
    5: 'Medium',
    6: 'Straight',
    7: 'Fast',
    8: 'Straight',
    9: 'Fast',
    10: 'Straight',
    11: 'Medium',
    12: 'Straight',
    13: 'slow',
    14: 'Straight'
}

labels_abuDhabi = {
    1: 'Straight',
    2: 'Medium',
    3: 'Straight',
    4: 'Slow',
    5: 'Straight',
    6: 'Slow',
    7: 'Straight',
    8: 'Medium',
    9: 'Straight',
    10: 'Slow',
    11: 'Medium',
    12: 'Fast',
    13: 'Straight'
}

labels_bahrain = {
    1: 'Straight',
    2: 'Slow',
    3: 'Straight',
    4: 'Medium',
    5: 'Straight',
    6: 'Fast',
    7: 'Slow',
    8: 'Straight',
    9: 'Slow',
    10: 'Straight',
    11: 'Fast',
    12: 'Medium',
    13: 'Straight',
    14: 'Medium',
    15: 'Straight'
}

labels_austria = {
    1: 'Straight',
    2: 'Medium',
    3: 'Straight',
    4: 'Slow',
    5: 'Straight',
    6: 'Slow',
    7: 'Straight',
    8: 'Fast',
    9: 'Straight',
    10: 'Fast',
    11: 'Straight'
}

labels_italy = {
    1: 'Straight',
    2: 'Slow',
    3: 'Straight',
    4: 'Slow',
    5: 'Medium',
    6: 'Medium',
    7: 'Straight',
    8: 'Fast',
    9: 'Straight',
    10: 'Fast',
    11: 'Straight'
}

label_dict = {
    'Spanish Grand Prix': labels_spanish,
    'British Grand Prix': labels_britian,
    'Bahrain Grand Prix': labels_bahrain,
    'Abu Dhabi Grand Prix': labels_abuDhabi,
    'Italian Grand Prix': labels_italy,
    'Austrian Grand Prix': labels_austria,
    'Japanese Grand Prix': labels_japan,
    "São Paulo Grand Prix": labels_brazil,
    "Belgian Grand Prix": labels_belgium,
    "Monaco Grand Prix": labels_monaco,
    "United States Grand Prix": labels_USA
}