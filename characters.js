/**
 * Dalseo Character Studio - Character SVG Renderer (Dynamic Skeletal Pose Engine)
 * Locks official character bible rules and dynamically renders SVGs based on custom pose parameters.
 */

const DALSEO_COLORS = {
  hair: '#604C3F',
  skin: '#EBC8A3',
  costume: '#B28247',
  outline: '#231815',
  background: 'none',
  blush: '#FFB2A6',
  white: '#FFFFFF',
  shadowCostume: '#966C39',
  shadowSkin: '#D9B48F',
  accentGreen: '#3A9D78',
  accentRed: '#D9534F',
  accentBlue: '#4A90E2',
  silver: '#E0E0E0',
  charcoal: '#333333'
};

const CharacterRenderer = {
  /**
   * Main render method
   * @param {string} character - 'dalsu', 'dalhee', or 'both'
   * @param {string} action - 'default', 'teaching', 'guiding', 'cleanup', 'exercising', 'cooking', 'working'
   * @param {string} emotion - 'friendly', 'happy', 'serious', 'energetic'
   * @param {object} [customPose] - Optional custom pose parameters
   * @returns {string} - SVG string
   */
  render(character, action, emotion, customPose = null) {
    // Determine the active pose parameters
    const pose = this.getPoseParameters(action, emotion, customPose);
    
    if (character === 'both') {
      return this.renderBoth(pose);
    }
    
    const isDalsu = character === 'dalsu';
    
    // SVG Outer Shell
    let svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 800 800" width="100%" height="100%">`;
    svg += this.getDefs();
    svg += `<g transform="translate(0, 0)">`;
    svg += this.renderSingleCharacter(isDalsu, pose, 400, 420);
    svg += `</g>`;
    svg += `</svg>`;
    return svg;
  },

  getDefs() {
    return `
      <defs>
        <filter id="soft-shadow" x="-10%" y="-10%" width="120%" height="120%">
          <feDropShadow dx="0" dy="8" stdDeviation="12" flood-color="#000000" flood-opacity="0.1" />
        </filter>
      </defs>
    `;
  },

  // Compile pose object from presets or custom overrides
  getPoseParameters(action, emotion, customPose) {
    // 1. Start with defaults
    const pose = {
      leftArmAngle: 0,
      rightArmAngle: 0,
      bodyLean: 0,
      legStance: 'standing', // 'standing', 'walking', 'running'
      expression: emotion || 'friendly',
      props: [] // list of active props
    };

    // 2. Apply action preset defaults
    if (action === 'teaching') {
      pose.leftArmAngle = 35;
      pose.rightArmAngle = -55;
      pose.props.push('pointer');
    } else if (action === 'guiding') {
      pose.leftArmAngle = -70;
      pose.rightArmAngle = 30;
      pose.props.push('sign');
    } else if (action === 'cleanup') {
      pose.leftArmAngle = 45;
      pose.rightArmAngle = 40;
      pose.bodyLean = 5;
      pose.props.push('grabber');
    } else if (action === 'exercising') {
      pose.leftArmAngle = 65;
      pose.rightArmAngle = -60;
      pose.bodyLean = 10;
      pose.legStance = 'running';
      pose.props.push('headband');
    } else if (action === 'cooking') {
      pose.leftArmAngle = 40;
      pose.rightArmAngle = -40;
      pose.props.push('chefhat', 'spatula');
    } else if (action === 'working') {
      pose.leftArmAngle = 60;
      pose.rightArmAngle = 60;
      pose.props.push('laptop');
    }

    // 3. Apply custom overrides if provided
    if (customPose) {
      if (customPose.leftArmAngle !== undefined) pose.leftArmAngle = customPose.leftArmAngle;
      if (customPose.rightArmAngle !== undefined) pose.rightArmAngle = customPose.rightArmAngle;
      if (customPose.bodyLean !== undefined) pose.bodyLean = customPose.bodyLean;
      if (customPose.legStance !== undefined) pose.legStance = customPose.legStance;
      if (customPose.expression !== undefined) pose.expression = customPose.expression;
      if (customPose.props !== undefined) pose.props = customPose.props;
    }

    return pose;
  },

  renderSingleCharacter(isDalsu, pose, cx, cy) {
    let html = '';
    
    // 1. Back Easel Board (Only if pointer is equipped)
    if (pose.props.includes('pointer')) {
      html += this.renderBackWhiteboard(cx, cy);
    }
    
    // 2. Legs (Dynamic stance)
    html += this.renderLegs(pose.legStance, cx, cy);
    
    // Apply body lean rotation group
    html += `<g transform="rotate(${pose.bodyLean}, ${cx}, ${cy + 130})">`;
    
    // 3. Torso (Official Costume)
    html += this.renderTorso(pose.props.includes('grabber'), cx, cy);
    
    // 4. Left Arm (Includes left props)
    html += this.renderLeftArm(pose, cx, cy);
    
    // 5. Right Arm (Includes right props)
    html += this.renderRightArm(pose, cx, cy);
    
    // 6. Head (Hair + Face base + Expression features + Head wear)
    html += this.renderHead(isDalsu, pose, cx, cy - 110);
    
    // 7. Front Props (Laptop, etc.)
    html += this.renderFrontProps(pose.props, cx, cy);
    
    html += `</g>`; // End lean group
    
    return html;
  },

  renderBackWhiteboard(cx, cy) {
    const outline = DALSEO_COLORS.outline;
    return `
      <!-- Whiteboard easel stand -->
      <line x1="${cx + 120}" y1="${cy + 50}" x2="${cx + 100}" y2="${cy + 220}" stroke="${outline}" stroke-width="10" stroke-linecap="round" />
      <line x1="${cx + 220}" y1="${cy + 50}" x2="${cx + 240}" y2="${cy + 220}" stroke="${outline}" stroke-width="10" stroke-linecap="round" />
      <line x1="${cx + 170}" y1="${cy + 50}" x2="${cx + 170}" y2="${cy + 240}" stroke="${outline}" stroke-width="6" stroke-linecap="round" />
      
      <!-- Board Frame -->
      <rect x="${cx + 70}" y="${cy - 90}" width="200" height="150" rx="10" fill="#FFFFFF" stroke="${outline}" stroke-width="10" />
      <path d="M ${cx + 75} ${cy - 90} L ${cx + 265} ${cy - 90}" stroke="${outline}" stroke-width="10" stroke-linecap="round" />
      
      <!-- Board content -->
      <line x1="${cx + 100}" y1="${cy + 30}" x2="${cx + 240}" y2="${cy + 30}" stroke="${outline}" stroke-width="4" stroke-linecap="round" />
      <line x1="${cx + 100}" y1="${cy - 60}" x2="${cx + 100}" y2="${cy + 30}" stroke="${outline}" stroke-width="4" stroke-linecap="round" />
      <path d="M ${cx + 105} ${cy + 15} Q ${cx + 160} ${cy + 10} ${cx + 200} ${cy - 30} T ${cx + 240} ${cy - 50}" fill="none" stroke="${DALSEO_COLORS.accentGreen}" stroke-width="6" stroke-linecap="round" />
      <circle cx="${cx + 240}" cy="${cy - 50}" r="6" fill="${DALSEO_COLORS.accentGreen}" />
      <line x1="${cx + 120}" y1="${cy - 75}" x2="${cx + 220}" y2="${cy - 75}" stroke="${DALSEO_COLORS.outline}" stroke-width="4" stroke-dasharray="8,5" stroke-linecap="round" />
    `;
  },

  renderLegs(stance, cx, cy) {
    const outline = DALSEO_COLORS.outline;
    const skin = DALSEO_COLORS.skin;
    
    if (stance === 'running') {
      return `
        <!-- Left Leg (Backwards) -->
        <g transform="translate(${cx - 50}, ${cy + 130}) rotate(45)">
          <rect x="-20" y="0" width="40" height="60" rx="20" fill="${skin}" stroke="${outline}" stroke-width="10" />
          <ellipse cx="0" cy="55" rx="28" ry="16" fill="${DALSEO_COLORS.white}" stroke="${outline}" stroke-width="10" />
          <rect x="-28" y="47" width="56" height="12" fill="${DALSEO_COLORS.accentRed}" />
        </g>
        <!-- Right Leg (Forwards) -->
        <g transform="translate(${cx + 40}, ${cy + 130}) rotate(-50)">
          <rect x="-20" y="0" width="40" height="65" rx="20" fill="${skin}" stroke="${outline}" stroke-width="10" />
          <ellipse cx="0" cy="60" rx="28" ry="16" fill="${DALSEO_COLORS.white}" stroke="${outline}" stroke-width="10" />
          <rect x="-28" y="52" width="56" height="12" fill="${DALSEO_COLORS.accentRed}" />
        </g>
      `;
    } else if (stance === 'walking') {
      return `
        <!-- Left Leg (Back) -->
        <g transform="translate(${cx - 45}, ${cy + 130}) rotate(20)">
          <rect x="-18" y="0" width="36" height="55" rx="15" fill="${skin}" stroke="${outline}" stroke-width="10" />
          <ellipse cx="-4" cy="50" rx="26" ry="15" fill="${skin}" stroke="${outline}" stroke-width="10" />
        </g>
        <!-- Right Leg (Forward) -->
        <g transform="translate(${cx + 45}, ${cy + 130}) rotate(-25)">
          <rect x="-18" y="0" width="36" height="58" rx="15" fill="${skin}" stroke="${outline}" stroke-width="10" />
          <ellipse cx="4" cy="53" rx="26" ry="15" fill="${skin}" stroke="${outline}" stroke-width="10" />
        </g>
      `;
    } else {
      // standing
      return `
        <!-- Left Leg -->
        <g transform="translate(${cx - 45}, ${cy + 130})">
          <rect x="-20" y="0" width="40" height="50" rx="15" fill="${skin}" stroke="${outline}" stroke-width="10" />
          <ellipse cx="-5" cy="45" rx="25" ry="15" fill="${skin}" stroke="${outline}" stroke-width="10" />
        </g>
        <!-- Right Leg -->
        <g transform="translate(${cx + 45}, ${cy + 130})">
          <rect x="-20" y="0" width="40" height="50" rx="15" fill="${skin}" stroke="${outline}" stroke-width="10" />
          <ellipse cx="5" cy="45" rx="25" ry="15" fill="${skin}" stroke="${outline}" stroke-width="10" />
        </g>
      `;
    }
  },

  renderTorso(isCleanup, cx, cy) {
    const outline = DALSEO_COLORS.outline;
    const costume = DALSEO_COLORS.costume;
    let html = `
      <!-- Main Torso Tunic -->
      <path d="M ${cx - 75} ${cy - 10} 
               C ${cx - 95} ${cy + 50}, ${cx - 90} ${cy + 110}, ${cx - 65} ${cy + 140}
               L ${cx + 65} ${cy + 140}
               C ${cx + 90} ${cy + 110}, ${cx + 95} ${cy + 50}, ${cx + 75} ${cy - 10}
               Z" 
            fill="${costume}" stroke="${outline}" stroke-width="10" stroke-linejoin="round" />
      <path d="M ${cx - 65} ${cy + 140} L ${cx + 65} ${cy + 140} C ${cx + 85} ${cy + 110}, ${cx + 90} ${cy + 60}, ${cx + 80} ${cy + 40} C ${cx + 60} ${cy + 80}, ${cx - 20} ${cy + 90}, ${cx - 65} ${cy + 140}" fill="${DALSEO_COLORS.shadowCostume}" opacity="0.4" />
      <path d="M ${cx - 35} ${cy - 10} L ${cx} ${cy + 25} L ${cx + 35} ${cy - 10}" fill="none" stroke="${outline}" stroke-width="8" stroke-linecap="round" />
    `;

    if (isCleanup) {
      // Volunteer Vest
      html += `
        <path d="M ${cx - 72} ${cy + 10}
                 C ${cx - 85} ${cy + 55}, ${cx - 82} ${cy + 105}, ${cx - 62} ${cy + 138}
                 L ${cx + 62} ${cy + 138}
                 C ${cx + 82} ${cy + 105}, ${cx + 85} ${cy + 55}, ${cx + 72} ${cy + 10}
                 L ${cx + 35} ${cy + 10} L ${cx} ${cy + 45} L ${cx - 35} ${cy + 10} Z"
              fill="#FF6B4A" stroke="${outline}" stroke-width="8" stroke-linejoin="round" />
        <path d="M ${cx - 65} ${cy + 75} L ${cx + 65} ${cy + 75}" fill="none" stroke="#A7F432" stroke-width="12" />
        <path d="M ${cx - 65} ${cy + 75} L ${cx + 65} ${cy + 75}" fill="none" stroke="${outline}" stroke-width="8" opacity="0.2" />
        <line x1="${cx - 35}" y1="${cy + 15}" x2="${cx - 45}" y2="${cy + 70}" stroke="#A7F432" stroke-width="10" stroke-linecap="round" />
        <line x1="${cx + 35}" y1="${cy + 15}" x2="${cx + 45}" y2="${cy + 70}" stroke="#A7F432" stroke-width="10" stroke-linecap="round" />
        <circle cx="${cx + 30}" cy="${cy + 105}" r="14" fill="${DALSEO_COLORS.white}" stroke="${outline}" stroke-width="5" />
        <path d="M ${cx + 26} ${cy + 109} Q ${cx + 30} ${cy + 98} ${cx + 35} ${cy + 100} Q ${cx + 30} ${cy + 105} ${cx + 26} ${cy + 109}" fill="${DALSEO_COLORS.accentGreen}" stroke="${outline}" stroke-width="2" />
      `;
    } else {
      html += `
        <path d="M ${cx - 35} ${cy + 50} C ${cx - 35} ${cy + 120}, ${cx + 35} ${cy + 120}, ${cx + 35} ${cy + 50} C ${cx + 35} ${cy + 25}, ${cx - 35} ${cy + 25}, ${cx - 35} ${cy + 50}" fill="${DALSEO_COLORS.white}" opacity="0.15" />
      `;
    }
    return html;
  },

  renderLeftArm(pose, cx, cy) {
    const outline = DALSEO_COLORS.outline;
    const skin = DALSEO_COLORS.skin;
    const costume = DALSEO_COLORS.costume;
    const isCleanup = pose.props.includes('grabber');
    const sleeveColor = isCleanup ? '#FF6B4A' : costume;
    
    // Hand default coordinates
    const hx = cx - 100;
    const hy = cy + 90;

    let propsHtml = '';
    
    // Attach Props to Left Hand
    if (pose.props.includes('sign')) {
      // Waving hand, but wait, if sign is active, left hand holds the signpost
      propsHtml += `
        <!-- Sign post held by left hand -->
        <g transform="translate(-108, 10)">
          <rect x="-6" y="-120" width="12" height="150" rx="3" fill="${DALSEO_COLORS.hair}" stroke="${outline}" stroke-width="6" />
          <path d="M -60 -180 L 60 -180 C 80 -180, 90 -160, 80 -140 L -60 -140 Z" fill="${DALSEO_COLORS.accentGreen}" stroke="${outline}" stroke-width="8" stroke-linejoin="round" />
          <path d="M 40 -160 L 55 -160 M 55 -160 L 48 -167 M 55 -160 L 48 -153" fill="none" stroke="${DALSEO_COLORS.white}" stroke-width="6" stroke-linecap="round" stroke-linejoin="round" />
          <line x1="-30" y1="-160" x2="20" y2="-160" stroke="${DALSEO_COLORS.white}" stroke-width="6" stroke-linecap="round" />
        </g>
      `;
    }
    
    if (pose.props.includes('grabber')) {
      // Blue trash bag
      propsHtml += `
        <!-- Blue trash bag held by hand -->
        <g transform="translate(-130, 95) rotate(-10)">
          <path d="M 0 10 C -40 20, -50 90, -10 100 C 30 110, 50 80, 40 20 C 30 10, 15 0, 0 10 Z" fill="#67B8D6" stroke="${outline}" stroke-width="8" stroke-linejoin="round" />
          <path d="M -5 12 C -15 -10, -35 -5, -30 15" fill="none" stroke="${outline}" stroke-width="8" stroke-linecap="round" />
          <path d="M 5 12 C 15 -10, 35 -5, 30 15" fill="none" stroke="${outline}" stroke-width="8" stroke-linecap="round" />
          <path d="M -8 60 L 8 60 L 0 72 Z" fill="none" stroke="${DALSEO_COLORS.white}" stroke-width="4" stroke-linecap="round" opacity="0.8" />
        </g>
      `;
    }

    if (pose.props.includes('spatula') || pose.props.includes('cooking')) {
      // Frying pan holding fish
      propsHtml += `
        <g transform="translate(-150, 70) rotate(-10)">
          <rect x="-80" y="-8" width="80" height="16" rx="4" fill="${DALSEO_COLORS.hair}" stroke="${outline}" stroke-width="8" />
          <ellipse cx="40" cy="0" rx="60" ry="24" fill="${DALSEO_COLORS.charcoal}" stroke="${outline}" stroke-width="10" />
          <ellipse cx="40" cy="-4" rx="50" ry="16" fill="#444" />
          <path d="M 20 -8 C 35 -18, 55 -18, 65 -8 L 75 -15 L 75 0 L 70 -5 C 60 5, 40 5, 20 -8 Z" fill="${DALSEO_COLORS.accentBlue}" stroke="${outline}" stroke-width="6" />
          <circle cx="30" cy="-8" r="2" fill="${outline}" />
          <path d="M 35 -20 Q 30 -30 35 -40" fill="none" stroke="${DALSEO_COLORS.white}" stroke-width="4" stroke-linecap="round" opacity="0.7" />
          <path d="M 50 -20 Q 45 -30 50 -40" fill="none" stroke="${DALSEO_COLORS.white}" stroke-width="4" stroke-linecap="round" opacity="0.7" />
        </g>
      `;
    }

    return `
      <!-- Left Arm (Pivot rotated) -->
      <g transform="rotate(${pose.leftArmAngle}, ${cx - 75}, ${cy + 25})">
        <path d="M ${cx - 75} ${cy + 25} Q ${cx - 110} ${cy + 55} ${hx} ${hy}" fill="none" stroke="${outline}" stroke-width="36" stroke-linecap="round" />
        <path d="M ${cx - 75} ${cy + 25} Q ${cx - 110} ${cy + 55} ${hx} ${hy}" fill="none" stroke="${sleeveColor}" stroke-width="26" stroke-linecap="round" />
        <circle cx="${hx}" cy="${hy}" r="16" fill="${skin}" stroke="${outline}" stroke-width="10" />
        ${propsHtml}
      </g>
    `;
  },

  renderRightArm(pose, cx, cy) {
    const outline = DALSEO_COLORS.outline;
    const skin = DALSEO_COLORS.skin;
    const costume = DALSEO_COLORS.costume;
    const isCleanup = pose.props.includes('grabber');
    const sleeveColor = isCleanup ? '#FF6B4A' : costume;
    
    // Hand default coordinates
    const hx = cx + 100;
    const hy = cy + 90;

    let propsHtml = '';
    
    // Attach Props to Right Hand
    if (pose.props.includes('pointer')) {
      // Pointer stick
      propsHtml += `
        <g transform="translate(130, 45) rotate(-35)">
          <rect x="-6" y="-140" width="12" height="150" rx="3" fill="${DALSEO_COLORS.hair}" stroke="${outline}" stroke-width="8" />
          <rect x="-10" y="-150" width="20" height="20" rx="5" fill="${DALSEO_COLORS.accentRed}" stroke="${outline}" stroke-width="6" />
        </g>
      `;
    }

    if (pose.props.includes('spatula')) {
      // Spatula
      propsHtml += `
        <g transform="translate(120, 20) rotate(-20)">
          <rect x="-5" y="-60" width="10" height="70" rx="3" fill="${DALSEO_COLORS.hair}" stroke="${outline}" stroke-width="6" />
          <path d="M -15 -85 L 15 -85 L 12 -60 L -12 -60 Z" fill="${DALSEO_COLORS.silver}" stroke="${outline}" stroke-width="6" stroke-linejoin="round" />
          <line x1="-5" y1="-80" x2="-5" y2="-65" stroke="${outline}" stroke-width="3" stroke-linecap="round" />
          <line x1="0" y1="-80" x2="0" y2="-65" stroke="${outline}" stroke-width="3" stroke-linecap="round" />
          <line x1="5" y1="-80" x2="5" y2="-65" stroke="${outline}" stroke-width="3" stroke-linecap="round" />
        </g>
      `;
    }

    if (pose.props.includes('grabber')) {
      // Trash picker
      propsHtml += `
        <g transform="translate(130, 85) rotate(25)">
          <line x1="0" y1="0" x2="80" y2="120" stroke="${outline}" stroke-width="16" />
          <line x1="0" y1="0" x2="80" y2="120" stroke="${DALSEO_COLORS.silver}" stroke-width="8" stroke-linecap="round" />
          <rect x="-10" y="-10" width="20" height="20" rx="4" fill="${DALSEO_COLORS.hair}" stroke="${outline}" stroke-width="6" />
          <g transform="translate(80, 120)">
            <path d="M -5 0 Q -15 15 -5 30" fill="none" stroke="${DALSEO_COLORS.accentRed}" stroke-width="6" stroke-linecap="round" />
            <path d="M 5 0 Q 15 15 5 30" fill="none" stroke="${DALSEO_COLORS.accentRed}" stroke-width="6" stroke-linecap="round" />
            <path d="M 0 15 C 15 10, 15 25, 5 30 C -5 35, -5 20, 0 15 Z" fill="${DALSEO_COLORS.accentGreen}" stroke="${outline}" stroke-width="4" />
          </g>
        </g>
      `;
    }

    return `
      <!-- Right Arm (Pivot rotated) -->
      <g transform="rotate(${pose.rightArmAngle}, ${cx + 75}, ${cy + 25})">
        <path d="M ${cx + 75} ${cy + 25} Q ${cx + 110} ${cy + 55} ${hx} ${hy}" fill="none" stroke="${outline}" stroke-width="36" stroke-linecap="round" />
        <path d="M ${cx + 75} ${cy + 25} Q ${cx + 110} ${cy + 55} ${hx} ${hy}" fill="none" stroke="${sleeveColor}" stroke-width="26" stroke-linecap="round" />
        <circle cx="${hx}" cy="${hy}" r="16" fill="${skin}" stroke="${outline}" stroke-width="10" />
        ${propsHtml}
      </g>
    `;
  },

  renderHead(isDalsu, pose, hx, hy) {
    const outline = DALSEO_COLORS.outline;
    const skin = DALSEO_COLORS.skin;
    const hair = DALSEO_COLORS.hair;
    const blush = DALSEO_COLORS.blush;
    const emotion = pose.expression;
    
    let html = '';
    
    // Hair Backing
    if (isDalsu) {
      // Dalsu Cloud Hair (3 top peaks, 2 lobes, symmetrical)
      html += `
        <!-- Dalsu Cloud Hair Backing -->
        <path d="M ${hx} ${hy - 110} 
                 C ${hx + 50} ${hy - 110}, ${hx + 90} ${hy - 95}, ${hx + 105} ${hy - 55}
                 C ${hx + 155} ${hy - 45}, ${hx + 165} ${hy + 5}, ${hx + 155} ${hy + 55}
                 C ${hx + 155} ${hy + 115}, ${hx + 105} ${hy + 145}, ${hx + 55} ${hy + 145}
                 C ${hx + 20} ${hy + 145}, ${hx} ${hy + 130}, ${hx} ${hy + 130}
                 C ${hx} ${hy + 130}, ${hx - 20} ${hy + 145}, ${hx - 55} ${hy + 145}
                 C ${hx - 105} ${hy + 145}, ${hx - 155} ${hy + 115}, ${hx - 155} ${hy + 55}
                 C ${hx - 165} ${hy + 5}, ${hx - 155} ${hy - 45}, ${hx - 105} ${hy - 55}
                 C ${hx - 90} ${hy - 95}, ${hx - 50} ${hy - 110}, ${hx} ${hy - 110} Z" 
              fill="${hair}" stroke="${outline}" stroke-width="10" stroke-linejoin="round" />
      `;
    } else {
      // Dalhee Mushroom Hair (symmetrical mushroom cap)
      html += `
        <!-- Dalhee Mushroom Hair Backing -->
        <path d="M ${hx} ${hy - 120}
                 C ${hx + 110} ${hy - 120}, ${hx + 170} ${hy - 70}, ${hx + 170} ${hy + 20}
                 C ${hx + 170} ${hy + 70}, ${hx + 130} ${hy + 90}, ${hx + 90} ${hy + 90}
                 C ${hx + 60} ${hy + 50}, ${hx + 30} ${hy + 70}, ${hx} ${hy + 70}
                 C ${hx - 30} ${hy + 70}, ${hx - 60} ${hy + 50}, ${hx - 90} ${hy + 90}
                 C ${hx - 130} ${hy + 90}, ${hx - 170} ${hy + 70}, ${hx - 170} ${hy + 20}
                 C ${hx - 170} ${hy - 70}, ${hx - 110} ${hy - 120}, ${hx} ${hy - 120} Z"
              fill="${hair}" stroke="${outline}" stroke-width="10" stroke-linejoin="round" />
      `;
    }
    
    // Face (Horizontal Oval)
    html += `
      <!-- Face Base (Horizontal Oval) -->
      <ellipse cx="${hx}" cy="${hy + 30}" rx="115" ry="85" fill="${skin}" stroke="${outline}" stroke-width="10" />
      <path d="M ${hx - 100} ${hy + 50} C ${hx - 60} ${hy + 95}, ${hx + 60} ${hy + 95}, ${hx + 100} ${hy + 50} C ${hx + 113} ${hy + 38}, ${hx + 115} ${hy + 30}, ${hx + 115} ${hy + 30} C ${hx + 115} ${hy + 30}, ${hx + 100} ${hy + 75}, ${hx} ${hy + 110} C ${hx - 100} ${hy + 75}, ${hx - 115} ${hy + 30}, ${hx - 115} ${hy + 30} C ${hx - 115} ${hy + 30}, ${hx - 113} ${hy + 38}, ${hx - 100} ${hy + 50}" fill="${DALSEO_COLORS.shadowSkin}" opacity="0.3" />
    `;
    
    // Add Front Bangs for Dalhee (6 tips)
    if (!isDalsu) {
      html += `
        <!-- Dalhee Front Bangs (6 distinct tips/curves across forehead) -->
        <path d="M ${hx - 110} ${hy - 15}
                 Q ${hx - 80} ${hy + 15} ${hx - 70} ${hy + 5}
                 Q ${hx - 50} ${hy + 20} ${hx - 42} ${hy + 8}
                 Q ${hx - 20} ${hy + 20} ${hx - 14} ${hy + 8}
                 Q ${hx + 15} ${hy + 20} ${hx + 20} ${hy + 5}
                 Q ${hx + 45} ${hy + 20} ${hx + 55} ${hy + 8}
                 Q ${hx + 80} ${hy + 15} ${hx + 110} ${hy - 15}
                 C ${hx + 120} ${hy - 60}, ${hx + 80} ${hy - 115}, ${hx} ${hy - 115}
                 C ${hx - 80} ${hy - 115}, ${hx - 120} ${hy - 60}, ${hx - 110} ${hy - 15} Z"
              fill="${hair}" stroke="${outline}" stroke-width="10" stroke-linejoin="round" />
      `;
    }
    
    // Headwear Poses (Chef hat or Running headband)
    if (pose.props.includes('chefhat')) {
      html += `
        <g transform="translate(${hx}, ${hy - 110})">
          <path d="M -50 -10 C -70 -40, -50 -80, -20 -70 C -20 -95, 20 -95, 20 -70 C 50 -80, 70 -40, 50 -10 Z" fill="${DALSEO_COLORS.white}" stroke="${outline}" stroke-width="10" stroke-linejoin="round" />
          <rect x="-45" y="-15" width="90" height="25" fill="${DALSEO_COLORS.white}" stroke="${outline}" stroke-width="10" rx="3" />
          <path d="M 0 -10 L 2 -4 L 8 -4 L 3 0 L 5 6 L 0 2 L -5 6 L -3 0 L -8 -4 L -2 -4 Z" fill="${DALSEO_COLORS.accentRed}" />
        </g>
      `;
    }
    
    if (pose.props.includes('headband')) {
      html += `
        <path d="M ${hx - 100} ${hy - 35} Q ${hx} ${hy - 45} ${hx + 100} ${hy - 35} L ${hx + 96} ${hy - 15} Q ${hx} ${hy - 25} ${hx - 96} ${hy - 15} Z" fill="${DALSEO_COLORS.accentRed}" stroke="${outline}" stroke-width="8" stroke-linejoin="round" />
        <path d="M ${hx - 98} ${hy - 25} Q ${hx} ${hy - 35} ${hx + 98} ${hy - 25}" fill="none" stroke="${DALSEO_COLORS.white}" stroke-width="4" />
      `;
    }
    
    // Glasses for teaching
    if (pose.props.includes('pointer')) {
      html += `
        <circle cx="${hx - 45}" cy="${hy + 20}" r="26" fill="none" stroke="${outline}" stroke-width="8" />
        <circle cx="${hx + 45}" cy="${hy + 20}" r="26" fill="none" stroke="${outline}" stroke-width="8" />
        <line x1="${hx - 19}" y1="${hy + 20}" x2="${hx + 19}" y2="${hy + 20}" stroke="${outline}" stroke-width="8" stroke-linecap="round" />
        <path d="M ${hx - 71} ${hy + 20} Q ${hx - 90} ${hy + 10} ${hx - 105} ${hy + 15}" fill="none" stroke="${outline}" stroke-width="6" />
        <path d="M ${hx + 71} ${hy + 20} Q ${hx + 90} ${hy + 10} ${hx + 105} ${hy + 15}" fill="none" stroke="${outline}" stroke-width="6" />
      `;
    }
    
    // Rosy cheeks
    html += `
      <ellipse cx="${hx - 70}" cy="${hy + 42}" rx="14" ry="8" fill="${blush}" opacity="0.6" />
      <ellipse cx="${hx + 70}" cy="${hy + 42}" rx="14" ry="8" fill="${blush}" opacity="0.6" />
    `;
    
    // Eyes
    if (isDalsu) {
      if (emotion === 'happy' || emotion === 'energetic') {
        html += `
          <circle cx="${hx - 40}" cy="${hy + 20}" r="11" fill="${outline}" />
          <circle cx="${hx - 43}" cy="${hy + 17}" r="4" fill="${DALSEO_COLORS.white}" />
          <circle cx="${hx + 40}" cy="${hy + 20}" r="11" fill="${outline}" />
          <circle cx="${hx + 37}" cy="${hy + 17}" r="4" fill="${DALSEO_COLORS.white}" />
        `;
      } else if (emotion === 'serious') {
        html += `
          <ellipse cx="${hx - 40}" cy="${hy + 20}" rx="8" ry="11" fill="${outline}" />
          <ellipse cx="${hx + 40}" cy="${hy + 20}" rx="8" ry="11" fill="${outline}" />
        `;
      } else {
        html += `
          <circle cx="${hx - 40}" cy="${hy + 20}" r="9" fill="${outline}" />
          <circle cx="${hx + 40}" cy="${hy + 20}" r="9" fill="${outline}" />
        `;
      }
    } else {
      // Dalhee: Hidden Eyes (closed curves)
      if (emotion === 'serious') {
        html += `
          <line x1="${hx - 55}" y1="${hy + 20}" x2="${hx - 30}" y2="${hy + 20}" stroke="${outline}" stroke-width="8" stroke-linecap="round" />
          <line x1="${hx + 30}" y1="${hy + 20}" x2="${hx + 55}" y2="${hy + 20}" stroke="${outline}" stroke-width="8" stroke-linecap="round" />
        `;
      } else if (emotion === 'friendly') {
        html += `
          <path d="M ${hx - 55} ${hy + 15} Q ${hx - 42} ${hy + 28} ${hx - 30} ${hy + 15}" fill="none" stroke="${outline}" stroke-width="8" stroke-linecap="round" />
          <path d="M ${hx + 30} ${hy + 15} Q ${hx + 42} ${hy + 28} ${hx + 55} ${hy + 15}" fill="none" stroke="${outline}" stroke-width="8" stroke-linecap="round" />
        `;
      } else {
        html += `
          <path d="M ${hx - 55} ${hy + 22} Q ${hx - 42} ${hy + 9} ${hx - 30} ${hy + 22}" fill="none" stroke="${outline}" stroke-width="8" stroke-linecap="round" />
          <path d="M ${hx + 30} ${hy + 22} Q ${hx + 42} ${hy + 9} ${hx + 55} ${hy + 22}" fill="none" stroke="${outline}" stroke-width="8" stroke-linecap="round" />
        `;
      }
    }
    
    // Mouth
    if (emotion === 'happy' || emotion === 'energetic') {
      html += `
        <path d="M ${hx - 20} ${hy + 38} Q ${hx} ${hy + 62} ${hx + 20} ${hy + 38} Z" fill="${DALSEO_COLORS.accentRed}" stroke="${outline}" stroke-width="8" stroke-linejoin="round" />
        <path d="M ${hx - 12} ${hy + 48} Q ${hx} ${hy + 38} ${hx + 12} ${hy + 48} C ${hx + 8} ${hy + 58}, ${hx - 8} ${hy + 58}, ${hx - 12} ${hy + 48}" fill="${blush}" />
      `;
    } else if (emotion === 'serious') {
      html += `
        <line x1="${hx - 15}" y1="${hy + 45}" x2="${hx + 15}" y2="${hy + 45}" stroke="${outline}" stroke-width="8" stroke-linecap="round" />
      `;
    } else {
      html += `
        <path d="M ${hx - 15} ${hy + 40} Q ${hx} ${hy + 52} ${hx + 15} ${hy + 40}" fill="none" stroke="${outline}" stroke-width="8" stroke-linecap="round" />
      `;
    }
    
    return html;
  },

  renderFrontProps(propsList, cx, cy) {
    const outline = DALSEO_COLORS.outline;
    let html = '';
    
    if (propsList.includes('laptop')) {
      html += `
        <g transform="translate(${cx}, ${cy + 80})">
          <path d="M -70 -50 L 70 -50 L 90 0 L -90 0 Z" fill="${DALSEO_COLORS.silver}" stroke="${outline}" stroke-width="8" stroke-linejoin="round" />
          <path d="M -62 -43 L 62 -43 L 80 -4 L -80 -4 Z" fill="${DALSEO_COLORS.accentBlue}" />
          <circle cx="0" cy="-23" r="10" fill="${DALSEO_COLORS.white}" opacity="0.9" />
          <path d="M -4 -23 L 4 -23 M 0 -27 L 0 -19" stroke="${DALSEO_COLORS.accentGreen}" stroke-width="3" stroke-linecap="round" />
          <path d="M -90 0 L 90 0 L 105 30 L -105 30 Z" fill="${DALSEO_COLORS.hair}" stroke="${outline}" stroke-width="8" stroke-linejoin="round" />
          <path d="M -80 6 L 80 6 L 88 24 L -88 24 Z" fill="${DALSEO_COLORS.charcoal}" />
          <rect x="-15" y="25" width="30" height="4" rx="1" fill="${DALSEO_COLORS.silver}" />
        </g>
      `;
    }
    return html;
  },

  renderBoth(pose) {
    let svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1000 800" width="100%" height="100%">`;
    svg += this.getDefs();
    
    // Dalsu left (cx = 300)
    svg += `<g transform="translate(0, 0)">`;
    svg += this.renderSingleCharacter(true, pose, 300, 420);
    svg += `</g>`;
    
    // Dalhee right (cx = 700)
    svg += `<g transform="translate(0, 0)">`;
    svg += this.renderSingleCharacter(false, pose, 700, 420);
    svg += `</g>`;
    
    svg += `</svg>`;
    return svg;
  }
};

// Export
window.CharacterRenderer = CharacterRenderer;
window.DALSEO_COLORS = DALSEO_COLORS;
