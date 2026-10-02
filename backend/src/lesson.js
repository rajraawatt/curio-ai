const VISUALS = new Set([
  "mountain",
  "rock",
  "cross-section",
  "minerals",
  "crystals",
  "atoms",
  "tectonics",
  "volcano",
  "time",
  "compare",
  "insight",
]);

function L(en, hi, es) {
  return { en, hi, es };
}

function stage(visual, label, caption, narration) {
  return { visual, label, caption, narration };
}

export const LESSON = {
  id: "mountains",
  title: "How Mountains Form",
  subject: "Earth science",
  grade: "Ages 11–14",
  narration: L(
    "Millions of years ago, this region looked very different. These mountains were formed over millions of years through tectonic forces.",
    "लाखों साल पहले यह इलाका बिलकुल अलग दिखता था। ये पहाड़ टेक्टोनिक शक्तियों से करोड़ों वर्षों में बने।",
    "Hace millones de años, esta región se veía muy distinta. Estas montañas se formaron durante millones de años por fuerzas tectónicas."
  ),
};

const rock = {
  id: "minerals",
  concept: "Minerals",
  title: "What is this rock made of?",
  stages: [
    stage(
      "rock",
      L("The rock", "चट्टान", "La roca"),
      L("Focusing on the rock…", "चट्टान पर ध्यान जा रहा है…", "Enfocando la roca…"),
      L(
        "Let's follow the question into the slope. This boulder has been part of the mountain for a very long time.",
        "चलो इस सवाल के साथ ढलान पर चलते हैं। यह चट्टान बहुत लंबे समय से पहाड़ का हिस्सा है।",
        "Sigamos la pregunta hasta la ladera. Esta roca forma parte de la montaña desde hace muchísimo tiempo."
      )
    ),
    stage(
      "cross-section",
      L("Cross-section", "कटाव", "Corte"),
      L(
        "A slice through the boulder shows pieces locked together.",
        "चट्टान के कटाव में टुकड़े एक-दूसरे में जकड़े दिखते हैं।",
        "Un corte de la roca muestra piezas encajadas entre sí."
      ),
      L(
        "If we could slice it open, we would not find one solid color. We would find pieces locked together.",
        "अगर हम इसे काटकर देखें, तो एक ही रंग नहीं मिलेगा। हमें आपस में जकड़े हुए टुकड़े मिलेंगे।",
        "Si pudiéramos abrirla, no veríamos un solo color. Veríamos piezas encajadas."
      )
    ),
    stage(
      "minerals",
      L("Minerals", "खनिज", "Minerales"),
      L(
        "This rock is made of different minerals like quartz, feldspar and mica.",
        "यह चट्टान क्वार्ट्ज, फेल्डस्पार और माइका जैसे अलग-अलग खनिजों से बनी है।",
        "Esta roca está hecha de minerales distintos, como cuarzo, feldespato y mica."
      ),
      L(
        "This rock is made of different minerals like quartz, feldspar and mica. Each mineral is a material with its own structure.",
        "यह चट्टान क्वार्ट्ज, फेल्डस्पार और माइका जैसे खनिजों से बनी है। हर खनिज की अपनी बनावट होती है।",
        "Esta roca está hecha de minerales como el cuarzo, el feldespato y la mica. Cada mineral tiene su propia estructura."
      )
    ),
    stage(
      "crystals",
      L("Crystals", "क्रिस्टल", "Cristales"),
      L(
        "Inside a mineral, atoms repeat in a crystal pattern.",
        "खनिज के अंदर परमाणु एक क्रिस्टल पैटर्न में दोहराते हैं।",
        "Dentro de un mineral, los átomos se repiten en un patrón cristalino."
      ),
      L(
        "Inside each mineral, atoms line up in a repeating pattern. That pattern is a crystal.",
        "हर खनिज के अंदर परमाणु एक दोहराव वाले पैटर्न में सजे होते हैं। वही पैटर्न क्रिस्टल है।",
        "Dentro de cada mineral, los átomos se alinean en un patrón que se repite. Ese patrón es un cristal."
      )
    ),
    stage(
      "atoms",
      L("Atoms", "परमाणु", "Átomos"),
      L(
        "Quartz is silicon and oxygen, repeated billions of times.",
        "क्वार्ट्ज सिलिकॉन और ऑक्सीजन है, अरबों बार दोहराया हुआ।",
        "El cuarzo es silicio y oxígeno, repetidos miles de millones de veces."
      ),
      L(
        "Quartz is silicon and oxygen, arranged again and again. The mountain is huge because this tiny pattern repeats billions of times.",
        "क्वार्ट्ज सिलिकॉन और ऑक्सीजन की बार-बार सजी हुई रचना है। पहाड़ इतना बड़ा इसलिए है क्योंकि यह छोटा पैटर्न अरबों बार दोहराता है।",
        "El cuarzo es silicio y oxígeno, ordenados una y otra vez. La montaña es enorme porque este patrón diminuto se repite miles de millones de veces."
      )
    ),
  ],
};

const tall = {
  id: "uplift",
  concept: "Mountain height",
  title: "How did the mountain become so tall?",
  stages: [
    stage(
      "mountain",
      L("The range", "पर्वत शृंखला", "La cordillera"),
      L(
        "These peaks were not always this tall.",
        "ये चोटियाँ हमेशा इतनी ऊँची नहीं थीं।",
        "Estas cumbres no siempre fueron tan altas."
      ),
      L(
        "The question is about height. These peaks were not always this tall.",
        "सवाल ऊँचाई का है। ये चोटियाँ हमेशा इतनी ऊँची नहीं थीं।",
        "La pregunta es sobre la altura. Estas cumbres no siempre fueron tan altas."
      )
    ),
    stage(
      "tectonics",
      L("Tectonic plates", "टेक्टोनिक प्लेटें", "Placas tectónicas"),
      L(
        "Earth's crust is broken into giant moving plates.",
        "पृथ्वी की पपड़ी विशाल चलती प्लेटों में टूटी हुई है।",
        "La corteza de la Tierra está partida en placas gigantes que se mueven."
      ),
      L(
        "Earth's crust is broken into giant plates. They move only a few centimeters each year.",
        "पृथ्वी की पपड़ी विशाल प्लेटों में बंटी है। वे हर साल बस कुछ सेंटीमीटर खिसकती हैं।",
        "La corteza terrestre está dividida en placas gigantes. Se mueven solo unos centímetros al año."
      )
    ),
    stage(
      "tectonics",
      L("Collision", "टक्कर", "Colisión"),
      L(
        "When plates crash, the crust is pushed upward.",
        "जब प्लेटें टकराती हैं, तो पपड़ी ऊपर की ओर दबती है।",
        "Cuando las placas chocan, la corteza es empujada hacia arriba."
      ),
      L(
        "When two plates crash, the crust has nowhere to go but up. Rock folds, breaks, and stacks.",
        "जब दो प्लेटें टकराती हैं, तो पपड़ी ऊपर के अलावा कहीं नहीं जा सकती। चट्टान मुड़ती है, टूटती है और परत बनती है।",
        "Cuando dos placas chocan, la corteza solo puede subir. La roca se pliega, se rompe y se apila."
      )
    ),
    stage(
      "time",
      L("Millions of years", "लाखों वर्ष", "Millones de años"),
      L(
        "A few centimeters a year, across deep time, becomes a range.",
        "हर साल कुछ सेंटीमीटर, बहुत लंबे समय में, एक पर्वत शृंखला बन जाते हैं।",
        "Unos centímetros al año, a lo largo de mucho tiempo, se vuelven una cordillera."
      ),
      L(
        "A few centimeters a year, for millions of years, becomes a mountain range. Slow change is how the Earth builds height.",
        "हर साल कुछ सेंटीमीटर, लाखों वर्षों तक, एक पर्वत शृंखला बन जाते हैं। धीमा बदलाव ही पृथ्वी की ऊँचाई बनाता है।",
        "Unos centímetros al año, durante millones de años, forman una cordillera. El cambio lento es como la Tierra gana altura."
      )
    ),
    stage(
      "mountain",
      L("The peaks today", "आज की चोटियाँ", "Las cumbres hoy"),
      L(
        "The mountain is still being pushed up, and still wearing down.",
        "पहाड़ अब भी ऊपर धकेला जा रहा है, और अब भी घिस रहा है।",
        "La montaña sigue siendo empujada hacia arriba y sigue desgastándose."
      ),
      L(
        "The mountain is still changing. Weather wears it down while the plates keep pushing.",
        "पहाड़ अब भी बदल रहा है। मौसम उसे घिसता है, और प्लेटें उसे ऊपर धकेलती रहती हैं।",
        "La montaña sigue cambiando. El clima la desgasta mientras las placas siguen empujando."
      )
    ),
  ],
};

const black = {
  id: "color",
  concept: "Rock color",
  title: "Why are some rocks black?",
  stages: [
    stage(
      "rock",
      L("A darker stone", "गहरा पत्थर", "Una piedra más oscura"),
      L(
        "Some rocks on this slope are pale. Some are nearly black.",
        "इस ढलान पर कुछ चट्टानें हल्की हैं। कुछ लगभग काली हैं।",
        "Algunas rocas de esta ladera son claras. Otras son casi negras."
      ),
      L(
        "Look across the slope. Some rocks are pale, and some are nearly black. Color is a clue, not a decoration.",
        "ढलान पर देखो। कुछ चट्टानें हल्की हैं और कुछ लगभग काली। रंग एक सुराग है, सिर्फ सजावट नहीं।",
        "Miren la ladera. Algunas rocas son claras y otras casi negras. El color es una pista, no un adorno."
      )
    ),
    stage(
      "compare",
      L("Two histories", "दो कहानियाँ", "Dos historias"),
      L(
        "Granite cooled slowly underground. Basalt cooled fast at the surface.",
        "ग्रेनाइट ज़मीन के नीचे धीरे ठंडा हुआ। बेसाल्ट सतह पर तेज़ी से ठंडा हुआ।",
        "El granito se enfrió despacio bajo tierra. El basalto se enfrió rápido en la superficie."
      ),
      L(
        "A pale, speckled rock like granite cooled slowly underground. A dark, fine rock like basalt cooled quickly.",
        "ग्रेनाइट जैसी हल्की, दानेदार चट्टान ज़मीन के नीचे धीरे ठंडी हुई। बेसाल्ट जैसी गहरी, बारीक चट्टान जल्दी ठंडी हुई।",
        "Una roca clara y moteada como el granito se enfrió despacio bajo tierra. Una roca oscura y fina como el basalto se enfrió rápido."
      )
    ),
    stage(
      "volcano",
      L("Volcanic birth", "ज्वालामुखी जन्म", "Nacimiento volcánico"),
      L(
        "Dark rock often begins as lava.",
        "गहरी चट्टान अक्सर लावा से शुरू होती है।",
        "La roca oscura a menudo empieza como lava."
      ),
      L(
        "Many black rocks begin as lava. They spill out, meet cold air, and freeze before large crystals can grow.",
        "कई काली चट्टानें लावा से शुरू होती हैं। वे बहती हैं, ठंडी हवा से मिलती हैं, और बड़े क्रिस्टल बनने से पहले जम जाती हैं।",
        "Muchas rocas negras empiezan como lava. Salen, encuentran aire frío y se solidifican antes de que crezcan cristales grandes."
      )
    ),
    stage(
      "minerals",
      L("Dark minerals", "गहरे खनिज", "Minerales oscuros"),
      L(
        "Basalt is rich in dark minerals such as pyroxene and olivine.",
        "बेसाल्ट में पाइरॉक्सीन और ओलिवीन जैसे गहरे खनिज अधिक होते हैं।",
        "El basalto es rico en minerales oscuros como el piroxeno y el olivino."
      ),
      L(
        "Basalt is rich in dark minerals like pyroxene and olivine. Granite grows pale crystals of quartz and feldspar.",
        "बेसाल्ट में पाइरॉक्सीन और ओलिवीन जैसे गहरे खनिज होते हैं। ग्रेनाइट में क्वार्ट्ज और फेल्डस्पार के हल्के क्रिस्टल बनते हैं।",
        "El basalto es rico en minerales oscuros como el piroxeno y el olivino. El granito forma cristales claros de cuarzo y feldespato."
      )
    ),
    stage(
      "insight",
      L("Color is a clue", "रंग एक सुराग है", "El color es una pista"),
      L(
        "Black rock tells us it cooled fast, from darker minerals.",
        "काली चट्टान बताती है कि वह गहरे खनिजों से जल्दी ठंडी हुई।",
        "La roca negra nos dice que se enfrió rápido, a partir de minerales más oscuros."
      ),
      L(
        "So a black rock is not painted by the mountain. Its color remembers the minerals inside, and how fast it cooled.",
        "काली चट्टान को पहाड़ ने रंगा नहीं है। उसका रंग अंदर के खनिजों और ठंडे होने की गति को याद रखता है।",
        "Una roca negra no está pintada por la montaña. Su color recuerda los minerales de su interior y lo rápido que se enfrió."
      )
    ),
  ],
};

export const PLANS = [rock, tall, black];

export function matchPlan(text) {
  const t = (text || "").toLowerCase();
  if (/black|basalt|why are some rocks/.test(t)) return black;
  if (/tall|uplift|tectonic|become so tall/.test(t)) return tall;
  if (/made of|what is this rock|minerals like|quartz|feldspar|mica/.test(t)) return rock;
  return null;
}

export function fallbackPlan(question) {
  const q = question.trim();
  return {
    id: "open",
    concept: "Open curiosity",
    title: q,
    source: "fallback",
    stages: [
      stage(
        "mountain",
        L("Same world", "वही दुनिया", "El mismo mundo"),
        L(
          "We stay inside the lesson, and turn toward the question.",
          "हम पाठ के अंदर ही रहते हैं, और सवाल की ओर मुड़ते हैं।",
          "Seguimos dentro de la lección y giramos hacia la pregunta."
        ),
        L(
          `The class is still in the mountain world. The question in front of us is: ${q}`,
          `कक्षा अब भी पहाड़ की दुनिया में है। हमारे सामने सवाल यह है: ${q}`,
          `La clase sigue en el mundo de la montaña. La pregunta delante de nosotros es: ${q}`
        )
      ),
      stage(
        "insight",
        L("Look closer", "और पास से देखो", "Mirar más de cerca"),
        L(
          "A good question changes what the class looks at.",
          "एक अच्छा सवाल बदल देता है कि कक्षा किस चीज़ को देखे।",
          "Una buena pregunta cambia lo que la clase mira."
        ),
        L(
          "We do not leave the lesson to read an answer. We change the view so the idea becomes something the whole class can see.",
          "हम जवाब पढ़ने के लिए पाठ नहीं छोड़ते। हम नज़ारा बदलते हैं ताकि विचार पूरी कक्षा को दिखे।",
          "No salimos de la lección para leer una respuesta. Cambiamos la vista para que toda la clase pueda ver la idea."
        )
      ),
      stage(
        "rock",
        L("Hold the object", "वस्तु को पकड़ो", "Sostener el objeto"),
        L(
          "Find the thing in the scene that the question is about.",
          "दृश्य में वह चीज़ ढूँढो जिसके बारे में सवाल है।",
          "Encuentren en la escena la cosa de la que habla la pregunta."
        ),
        L(
          "Every question in this world has an object: a rock, a peak, a layer, a force. We put that object in the center.",
          "इस दुनिया के हर सवाल की एक वस्तु है: चट्टान, चोटी, परत या बल। हम उसी वस्तु को बीच में रखते हैं।",
          "Cada pregunta en este mundo tiene un objeto: una roca, una cumbre, una capa, una fuerza. Ponemos ese objeto en el centro."
        )
      ),
      stage(
        "atoms",
        L("The hidden scale", "छिपा पैमाना", "La escala oculta"),
        L(
          "Then we change scale, from the mountain to the mechanism.",
          "फिर हम पैमाना बदलते हैं, पहाड़ से लेकर उसकी प्रक्रिया तक।",
          "Luego cambiamos de escala, de la montaña al mecanismo."
        ),
        L(
          "Understanding usually means changing scale. The class moves from the mountain they can see to the process that built it.",
          "समझना अक्सर पैमाना बदलना होता है। कक्षा उस पहाड़ से आगे बढ़ती है जो दिखता है, उस प्रक्रिया तक जिसने उसे बनाया।",
          "Comprender suele ser cambiar de escala. La clase pasa de la montaña que ve al proceso que la formó."
        )
      ),
      stage(
        "mountain",
        L("Return with a new eye", "नई नज़र के साथ लौटो", "Volver con otros ojos"),
        L(q, q, q),
        L(
          "When we return to the range, it is the same mountain. The class is looking at it with the question still in the room.",
          "जब हम शृंखला पर लौटते हैं, पहाड़ वही होता है। कक्षा उसे उस सवाल के साथ देख रही होती है जो अब भी कमरे में है।",
          "Cuando volvemos a la cordillera, es la misma montaña. La clase la mira con la pregunta todavía en el aula."
        )
      ),
    ],
  };
}

export function planningHold(question) {
  return {
    id: "planning",
    concept: "Planning",
    title: question,
    stages: [
      stage(
        "insight",
        L("Reshaping the world", "दुनिया बदल रही है", "Transformando el mundo"),
        L(
          "CURIO is planning the transformation around this question.",
          "CURIO इस सवाल के आसपास बदलाव की योजना बना रहा है।",
          "CURIO está planeando la transformación alrededor de esta pregunta."
        ),
        L(
          "The teacher is holding the lesson. Gemini is choosing the scenes that will answer this question for the whole class.",
          "शिक्षक पाठ को थामे हुए हैं। Gemini उन दृश्यों को चुन रहा है जो इस सवाल का जवाब पूरी कक्षा को देंगे।",
          "La docente sostiene la lección. Gemini está eligiendo las escenas que responderán esta pregunta para toda la clase."
        )
      ),
    ],
  };
}

export function normalizePlan(raw, question) {
  const stages = Array.isArray(raw?.stages) ? raw.stages : [];
  const clean = stages
    .filter((s) => s && VISUALS.has(s.visual))
    .slice(0, 6)
    .map((s) => ({
      visual: s.visual,
      label: asLang(s.label, "Scene"),
      caption: asLang(s.caption, question),
      narration: asLang(s.narration, question),
    }));
  if (clean.length < 3) return null;
  return {
    id: "gemini",
    concept: typeof raw.concept === "string" ? raw.concept.slice(0, 48) : "Gemini scene",
    title: typeof raw.title === "string" ? raw.title.slice(0, 140) : question,
    stages: clean,
  };
}

function asLang(value, fallback) {
  if (value && typeof value === "object") {
    return {
      en: String(value.en || fallback),
      hi: String(value.hi || value.en || fallback),
      es: String(value.es || value.en || fallback),
    };
  }
  const text = typeof value === "string" && value.trim() ? value.trim() : fallback;
  return { en: text, hi: text, es: text };
}

export function textOf(field, lang = "en") {
  if (!field) return "";
  if (typeof field === "string") return field;
  return field[lang] || field.en || "";
}
