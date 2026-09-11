/**
 * Application Entry Point & State Coordinator
 * Part of "The Thinking Experiment" PhysicsKit
 */

import { ApparatusView } from './components/ApparatusView.js';
import { PhotogateSim } from './components/PhotogateSim.js';
import { TickerTapeSim } from './components/TickerTapeSim.js';
import { GraphView } from './components/GraphView.js';
import { LabReportView } from './components/LabReportView.js';

class App {
  constructor() {
    this.activeTab = 'apparatus';
    this.init();
  }

  init() {
    // 1. Initialize Components
    this.apparatusView = new ApparatusView('panelApparatus');
    this.labReportView = new LabReportView('panelReport');

    this.graphView = new GraphView('panelGraphs', (method, fitResult, graphImg) => {
      // Whenever graph fit updates, sync with lab report
      this.labReportView.updateFitData(method, fitResult, graphImg);
    });

    this.photogateSim = new PhotogateSim('panelPhotogates', (data) => {
      // Receive data from photogate experiment
      this.graphView.setDataset('photogates', data.points);
      // Switch to graph tab to inspect the fit
      this.switchTab('graphs');
    });

    this.tickerTapeSim = new TickerTapeSim('panelTicker', (data) => {
      // Receive data from ticker tape experiment
      this.graphView.setDataset('ticker', data.points);
      // Switch to graph tab to inspect the fit
      this.switchTab('graphs');
    });

    // 2. Attach Tab Navigation
    this.attachTabEvents();

    // 3. Populate default initial runs so graphs and report are pre-configured if teacher demonstrates right away
    setTimeout(() => {
      // Preload default ticker dataset
      if (this.tickerTapeSim) {
        this.tickerTapeSim.sendDataToGraph();
      }
      // Preload default photogates dataset
      if (this.photogateSim) {
        this.photogateSim.autoFillData();
        this.photogateSim.sendDataToGraph();
      }
      // Return to apparatus tab as initial starting view
      this.switchTab('apparatus');
    }, 100);
  }

  attachTabEvents() {
    const tabButtons = document.querySelectorAll('.tab-btn');
    tabButtons.forEach(btn => {
      btn.addEventListener('click', () => {
        const tabKey = btn.dataset.tab;
        if (tabKey) {
          this.switchTab(tabKey);
        }
      });
    });
  }

  switchTab(tabKey) {
    this.activeTab = tabKey;

    // Update tab button states
    document.querySelectorAll('.tab-btn').forEach(btn => {
      btn.classList.toggle('active', btn.dataset.tab === tabKey);
    });

    // Update panel visibility
    document.querySelectorAll('.tab-content-panel').forEach(panel => {
      panel.classList.toggle('active', panel.id === `panel${this.capitalize(tabKey)}`);
    });

    // Redraw canvases on tab change for sharp display
    if (tabKey === 'photogates' && this.photogateSim) {
      this.photogateSim.drawApparatus();
    } else if (tabKey === 'ticker' && this.tickerTapeSim) {
      this.tickerTapeSim.drawTapeAndRuler();
    } else if (tabKey === 'graphs' && this.graphView) {
      this.graphView.drawGraph();
    }
  }

  capitalize(str) {
    if (!str) return '';
    return str.charAt(0).toUpperCase() + str.slice(1);
  }
}

// Bootstrap application when DOM is loaded
window.addEventListener('DOMContentLoaded', () => {
  window.physicsLabApp = new App();
});
