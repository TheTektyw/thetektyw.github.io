let sliders = [];
let sliderIdCounter = 0;
let brainletMode = false;

function addSlider() {
    const id = sliderIdCounter++;
    sliders.push({
        id,
        min: 10,
        max: 20,
        value: 15,
        invert: false,
        error: null
    });
    render();
    updateResults();
}

function toggleBrainletMode(enabled) {
    brainletMode = enabled;
    updateResults();
}

function removeSlider(id) {
    sliders = sliders.filter(s => s.id !== id);
    render();
    updateResults();
}

function updateSliderValue(id, field, value) {
    const slider = sliders.find(s => s.id === id);
    if (!slider) return;

    const numValue = value === '' ? '' : parseInt(value, 10);

    // Validate and update
    if (field === 'min' || field === 'max') {
        slider[field] = numValue;
        slider.error = null;

        // Validate constraints
        if (slider.min !== '' && slider.max !== '') {
            if (isNaN(slider.min) || isNaN(slider.max)) {
                slider.error = 'Both min and max must be integers';
            } else if (slider.min > slider.max) {
                slider.error = 'Minimum cannot be greater than maximum';
            }
        }

        // Adjust slider value if out of bounds
        if (slider.min !== '' && slider.max !== '' && !isNaN(slider.min) && !isNaN(slider.max)) {
            const sliderMin = Math.round(slider.min * 0.78);
            const sliderMax = Math.round(slider.max * 1.22);
            if (slider.value < sliderMin) slider.value = sliderMin;
            if (slider.value > sliderMax) slider.value = sliderMax;
        }

        render();
    } else if (field === 'value') {
        slider.value = numValue;
    } else if (field === 'invert') {
        slider.invert = value;
        // Update slider track colors immediately when invert changes
        const rangeInput = document.getElementById(`slider-${id}`);
        if (rangeInput) {
            updateSliderTrack(rangeInput, value);
        }
    }

    updateResults();
}

function getSliderRange(slider) {
    if (slider.min === '' || slider.max === '' || isNaN(slider.min) || isNaN(slider.max)) {
        return { min: 0, max: 100 };
    }
    return {
        min: Math.round(slider.min * 0.78),
        max: Math.round(slider.max * 1.22)
    };
}

function updateSliderTrack(rangeInput, isInverted) {
    const min = parseFloat(rangeInput.min);
    const max = parseFloat(rangeInput.max);
    const value = parseFloat(rangeInput.value);
    const percent = max > min ? ((value - min) / (max - min)) * 100 : 0;
    
    // Invert colors based on invert flag
    if (isInverted) {
        rangeInput.style.background = `linear-gradient(to right, #90EE90 0%, #90EE90 ${percent}%, #CD5C5C ${percent}%, #CD5C5C 100%)`;
    } else {
        rangeInput.style.background = `linear-gradient(to right, #CD5C5C 0%, #CD5C5C ${percent}%, #90EE90 ${percent}%, #90EE90 100%)`;
    }
}

function calculateProbability(slider) {
    if (slider.min === '' || slider.max === '' || isNaN(slider.min) || isNaN(slider.max) || slider.error) {
        return null;
    }

    const min = parseInt(slider.min, 10);
    const max = parseInt(slider.max, 10);
    const userValue = parseInt(slider.value, 10);

    if (min > max) return null;

    // Exact mathematical calculation
    let successCount = 0;
    let totalCount = 0;

    // All possible integers from min to max (inclusive)
    for (let randomInt = min; randomInt <= max; randomInt++) {
        // All possible multipliers from 0.78 to 1.22 in 0.01 increments
        for (let m = 78; m <= 122; m++) {
            const multiplier = m / 100;
            
            // Calculate result: multiply by multiplier and round
            const result = Math.round(randomInt * multiplier);
            
            // Default: probability that randomized value >= user value
            let success = false;
            if (slider.invert) {
                // Inverted: probability that user value >= randomized value
                success = userValue >= result;
            } else {
                success = result >= userValue;
            }
            
            if (success) {
                successCount++;
            }
            
            totalCount++;
        }
    }

    return totalCount > 0 ? successCount / totalCount : 0;
}

function updateResults() {
    const resultsContainer = document.getElementById('resultsContainer');

    if (sliders.length === 0) {
        resultsContainer.innerHTML = '<div class="empty-message">Add modifiers to see results</div>';
        return;
    }

    // Check if all sliders are valid
    const validSliders = sliders.filter(s => !s.error && s.min !== '' && s.max !== '' && !isNaN(s.min) && !isNaN(s.max) && s.min <= s.max);

    if (validSliders.length === 0) {
        resultsContainer.innerHTML = '<div class="empty-message">Fix modifier errors to see results</div>';
        return;
    }

    let html = '<div class="results-grid">';

    // Individual probabilities
    const probabilities = [];
    validSliders.forEach((slider, index) => {
        const prob = calculateProbability(slider);
        if (prob !== null) {
            probabilities.push(prob);
            const displayValue = brainletMode ? '50.00%' : `${(prob * 100).toFixed(2)}%`;
            html += `
                <div class="result-item">
                    <div class="result-item-title">Modifier ${slider.id + 1}</div>
                    <div class="result-item-value">${displayValue}</div>
                </div>
            `;
        }
    });

    html += '</div>';

    // Combined probability (product of all individual probabilities) multiplied by 0.5
    if (probabilities.length > 0) {
        const combinedProb = probabilities.reduce((a, b) => a * b, 1) * 0.5;
        const combinedPercentage = (combinedProb * 100).toFixed(2);
        
        // Calculate 1:x odds format
        let oddsText = '';
        if (combinedProb > 0) {
            const odds = Math.round(1 / combinedProb);
            oddsText = `~1:${odds}`;
        } else {
            oddsText = '1:∞';
        }

        const displayValue = brainletMode ? '50.00% (50:50)' : `${combinedPercentage}% (${oddsText})`;
        const displayNote = brainletMode ? 'yOu eiTHeR hiT iT oR yOu DOn\'T' : '50% chance to destroy item included';
        const brainletImage = brainletMode ? '<img src="brainlet.png" alt="Brainlet Mode" class="brainlet-image">' : '';

        html += `
            <div class="combined-result">
                <div class="combined-result-title">Combined Probability (All Conditions)</div>
                <div class="combined-result-value">${displayValue}</div>
                <div class="combined-result-note">${displayNote}</div>
            </div>
            ${brainletImage}
        `;
    }

    resultsContainer.innerHTML = html;
}

function render() {
    const container = document.getElementById('slidersContainer');
    const emptyMessage = document.getElementById('emptyMessage');

    if (sliders.length === 0) {
        container.innerHTML = '';
        emptyMessage.style.display = 'block';
        return;
    }

    emptyMessage.style.display = 'none';

    container.innerHTML = sliders.map(slider => {
        const range = getSliderRange(slider);
        const hasError = !!slider.error;

        return `
            <div class="slider-item">
                <div class="slider-header">
                    <div class="slider-title">Modifier ${slider.id + 1}</div>
                    <button class="btn btn-danger" onclick="removeSlider(${slider.id})">Remove</button>
                </div>

                <div class="slider-body">
                    <div class="input-group">
                        <span class="range-bracket">(</span>
                        <div class="input-field">
                            <input 
                                type="number" 
                                value="${slider.min === '' ? '' : slider.min}"
                                onchange="updateSliderValue(${slider.id}, 'min', this.value)"
                                class="${hasError ? 'error' : ''}"
                            >
                        </div>
                        <span class="range-separator">-</span>
                        <div class="input-field">
                            <input 
                                type="number" 
                                value="${slider.max === '' ? '' : slider.max}"
                                onchange="updateSliderValue(${slider.id}, 'max', this.value)"
                                class="${hasError ? 'error' : ''}"
                            >
                        </div>
                        <span class="range-bracket">)</span>
                    </div>
                    ${hasError ? `<div class="error-message show">${slider.error}</div>` : ''}

                    ${!hasError ? `
                        <div class="slider-control">
                            <input 
                                type="range" 
                                id="slider-${slider.id}"
                                min="${range.min}" 
                                max="${range.max}" 
                                value="${slider.value}"
                            >
                            <div class="value-display">
                                <span class="value" id="value-${slider.id}">${slider.value}</span>
                            </div>
                        </div>

                        <div class="checkbox-group">
                            <input 
                                type="checkbox" 
                                id="invert-${slider.id}"
                                ${slider.invert ? 'checked' : ''}
                                onchange="updateSliderValue(${slider.id}, 'invert', this.checked)"
                            >
                            <label for="invert-${slider.id}">Invert</label>
                        </div>
                    ` : ''}
                </div>
            </div>
        `;
    }).join('');

    // Add event listeners to sliders after rendering
    sliders.forEach(slider => {
        if (!slider.error) {
            const rangeInput = document.getElementById(`slider-${slider.id}`);
            const valueDisplay = document.getElementById(`value-${slider.id}`);
            if (rangeInput) {
                updateSliderTrack(rangeInput, slider.invert);
                rangeInput.addEventListener('input', (e) => {
                    updateSliderValue(slider.id, 'value', e.target.value);
                    valueDisplay.textContent = e.target.value;
                    updateSliderTrack(rangeInput, slider.invert);
                });
            }
        }
    });
}

// Initialize with 1 slider by default
sliders.push({
    id: sliderIdCounter++,
    min: 10,
    max: 20,
    value: 22,
    invert: false,
    error: null
});

// Initial render
render();
updateResults();
