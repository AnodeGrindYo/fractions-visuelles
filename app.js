/**
 * @file app.js
 * @description
 * Application principale de "fractions-visuelles".
 * Contient la logique de génération d'exercices visuels de fractions,
 * l'interface avec le DOM et la gestion des interactions utilisateur.
 *
 * Documentation complète en français, conçue pour être didactique :
 * - explication des responsabilités du module,
 * - description des fonctions publiques/privées,
 * - exemples d'utilisation et cas d'erreur.
 *
 * Conventions :
 * - Toutes les fonctions exportées (si utilisation de modules) sont documentées avec @param et @returns.
 * - Fonctions utilitaires internes sont commentées en ligne.
 */

/**
 * Génère une fraction aléatoire adaptée à l'exercice.
 *
 * Règles proposées :
 * - Le numérateur et le dénominateur sont des entiers positifs.
 * - Le dénominateur est supérieur au numérateur pour obtenir une fraction propre,
 *   sauf si l'exercice doit montrer des fractions impropres.
 *
 * @param {Object} [options] - Options de génération.
 * @param {number} [options.maxDenominator=12] - Dénominateur maximal autorisé.
 * @param {boolean} [options.allowImproper=false] - Autoriser les fractions impropres.
 * @returns {{numerator:number, denominator:number}} Une fraction représentée par numérateur et dénominateur.
 *
 * @example
 * const f = generateRandomFraction({maxDenominator:8});
 * // f -> { numerator: 3, denominator: 8 }
 */
function generateRandomFraction(options = {}) {
  const maxDenominator = options.maxDenominator || 12;
  const allowImproper = !!options.allowImproper;

  // Génère un dénominateur entre 2 et maxDenominator inclus
  const denominator = Math.floor(Math.random() * (maxDenominator - 1)) + 2;

  // Si on n'autorise pas les impropres, on prend numérateur < dénominateur
  let numerator = Math.floor(Math.random() * denominator);
  if (numerator === 0) numerator = 1; // évite la fraction 0/x sauf si souhaité

  if (allowImproper) {
    // possibilité d'avoir numerator >= denominator
    if (Math.random() < 0.25) {
      numerator = Math.floor(Math.random() * (maxDenominator * 1.5)) + 1;
    }
  }

  return { numerator, denominator };
}

/**
 * Réduit une fraction à sa forme irréductible en utilisant le PGCD.
 *
 * @param {number} numerator - Numérateur de la fraction (entier).
 * @param {number} denominator - Dénominateur de la fraction (entier, non nul).
 * @returns {{numerator:number, denominator:number}} Fraction réduite.
 *
 * @throws {Error} Lance une erreur si denominator vaut 0.
 *
 * @example
 * reduceFraction(6, 8); // -> { numerator: 3, denominator: 4 }
 */
function reduceFraction(numerator, denominator) {
  if (denominator === 0) throw new Error('Denominator cannot be 0');

  const gcd = (a, b) => {
    a = Math.abs(a); b = Math.abs(b);
    while (b !== 0) {
      const t = a % b;
      a = b;
      b = t;
    }
    return a;
  };

  const g = gcd(numerator, denominator);
  return { numerator: numerator / g, denominator: denominator / g };
}

/**
 * Crée l'élément visuel (SVG/HTML) représentant une fraction pour l'exercice.
 *
 * Cette fonction isole la logique de représentation graphique :
 * - elle calcule la disposition visuelle (lignes, arcs, secteurs),
 * - crée les éléments DOM nécessaires,
 * - attache les attributs et classes CSS pour le style.
 *
 * @param {{numerator:number, denominator:number}} fraction - Fraction à représenter.
 * @param {Object} [opts] - Options de rendu.
 * @param {string} [opts.mode='sectors'] - Mode d'affichage ('sectors' | 'bars' | 'dots').
 * @param {number} [opts.width=200] - Largeur souhaitée en pixels (pour SVG/canvas).
 * @returns {HTMLElement} Élément DOM contenant la représentation visuelle.
 *
 * @example
 * const node = renderFraction({numerator:2, denominator:5}, {mode:'sectors', width:300});
 * document.body.appendChild(node);
 */
function renderFraction(fraction, opts = {}) {
  const mode = opts.mode || 'sectors';
  const width = opts.width || 200;

  // Container principal
  const container = document.createElement('div');
  container.className = 'fraction-visual';
  container.style.width = `${width}px`;

  // Titre accessible (pour lecteurs d'écran)
  const title = document.createElement('span');
  title.className = 'sr-only';
  title.textContent = `Fraction ${fraction.numerator} sur ${fraction.denominator}`;
  container.appendChild(title);

  if (mode === 'sectors') {
    // Représentation en secteurs circulaires (cercle découpé)
    const svgNS = 'http://www.w3.org/2000/svg';
    const svg = document.createElementNS(svgNS, 'svg');
    svg.setAttribute('viewBox', '0 0 100 100');
    svg.setAttribute('width', '100%');
    svg.setAttribute('height', '100%');

    const total = fraction.denominator;
    const filled = fraction.numerator;

    // Calcul des secteurs et ajout au SVG
    let startAngle = -Math.PI / 2; // commence en haut
    for (let i = 0; i < total; i++) {
      const endAngle = startAngle + (2 * Math.PI) / total;
      const largeArcFlag = (endAngle - startAngle) > Math.PI ? 1 : 0;

      const x1 = 50 + 50 * Math.cos(startAngle);
      const y1 = 50 + 50 * Math.sin(startAngle);
      const x2 = 50 + 50 * Math.cos(endAngle);
      const y2 = 50 + 50 * Math.sin(endAngle);

      const path = document.createElementNS(svgNS, 'path');
      const d = `M50 50 L ${x1} ${y1} A 50 50 0 ${largeArcFlag} 1 ${x2} ${y2} Z`;
      path.setAttribute('d', d);
      path.setAttribute('stroke', '#333');
      path.setAttribute('stroke-width', '0.2');
      path.setAttribute('fill', i < filled ? '#4caf50' : '#eee');
      svg.appendChild(path);

      startAngle = endAngle;
    }

    container.appendChild(svg);
  } else if (mode === 'bars') {
    // Représentation en barres (rectangles divisés)
    const row = document.createElement('div');
    row.className = 'fraction-bars';
    row.style.display = 'flex';
    for (let i = 0; i < fraction.denominator; i++) {
      const cell = document.createElement('div');
      cell.className = 'bar-cell';
      cell.style.flex = '1';
      cell.style.border = '1px solid #ccc';
      cell.style.height = '30px';
      cell.style.background = i < fraction.numerator ? '#4caf50' : '#f0f0f0';
      row.appendChild(cell);
    }
    container.appendChild(row);
  } else {
    // Mode par défaut : points
    const dots = document.createElement('div');
    dots.className = 'fraction-dots';
    for (let i = 0; i < fraction.denominator; i++) {
      const dot = document.createElement('span');
      dot.className = 'dot';
      dot.style.display = 'inline-block';
      dot.style.width = '12px';
      dot.style.height = '12px';
      dot.style.margin = '2px';
      dot.style.borderRadius = '50%';
      dot.style.background = i < fraction.numerator ? '#4caf50' : '#ddd';
      dots.appendChild(dot);
    }
    container.appendChild(dots);
  }

  return container;
}

/**
 * Initialise l'interface utilisateur : lie les boutons, zones d'affichage et
 * crée le premier exercice.
 *
 * Cette fonction est l'entrypoint côté UI. Elle :
 * - récupère les éléments DOM nécessaires,
 * - attache les gestionnaires d'événements,
 * - lance la génération d'un exercice initial.
 *
 * @param {Object} [config] - Configuration d'initialisation (facultative).
 * @param {string} [config.mode] - Mode de rendu par défaut ('sectors'|'bars'|'dots').
 * @param {number} [config.maxDenominator] - Dénominateur maximal pour la génération de fractions.
 * @returns {void}
 *
 * @example
 * // Au chargement de la page :
 * document.addEventListener('DOMContentLoaded', () => initUI({mode:'bars'}));
 */
function initUI(config = {}) {
  const mode = config.mode || 'sectors';
  const maxDenominator = config.maxDenominator || 8;

  // Sélecteurs DOM attendus — vérifier leur présence
  const display = document.getElementById('exercise-display');
  const btnNew = document.getElementById('btn-new');
  const selectMode = document.getElementById('select-mode');

  if (!display || !btnNew || !selectMode) {
    console.warn('Elements UI manquants : vérifie index.html (ids: exercise-display, btn-new, select-mode)');
    return;
  }

  // Handler pour générer un nouvel exercice
  const makeExercise = () => {
    const f = generateRandomFraction({ maxDenominator });
    const reduced = reduceFraction(f.numerator, f.denominator);

    // Vide l'affichage puis ajoute la représentation visuelle
    display.innerHTML = '';
    const node = renderFraction(reduced, { mode, width: 220 });
    display.appendChild(node);

    // Affiche la fraction sous forme texte (utile pour retour pédagogique)
    const text = document.createElement('div');
    text.className = 'fraction-text';
    text.textContent = `${reduced.numerator} / ${reduced.denominator}`;
    display.appendChild(text);
  };

  // Attache événements
  btnNew.addEventListener('click', makeExercise);
  selectMode.addEventListener('change', (e) => {
    // met à jour le mode et recrée l'exercice courant
    const newMode = e.target.value;
    initUI({ mode: newMode, maxDenominator }); // réinitialise avec nouveau mode
  });

  // Génération initiale
  makeExercise();
}

/**
 * Point d'entrée : démarre l'application si le script est exécuté directement
 * dans le navigateur (non importé comme module).
 */
if (typeof window !== 'undefined') {
  document.addEventListener('DOMContentLoaded', () => initUI({ mode: 'sectors', maxDenominator: 8 }));
}

// Exports pour tests/unités (si utilisation de bundler/module)
if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    generateRandomFraction,
    reduceFraction,
    renderFraction,
    initUI
  };
}
