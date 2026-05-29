/**
 * Chart Module — Liquid Glass Dark Theme
 * Apple-inspired K-line visualization with glowing lines & glass containers
 */

let klineChart = null;
let volumeChart = null;

class ChartManager {

  static COLOR = {
    bg:        'transparent',
    grid:      'rgba(255,255,255,0.06)',
    text:      'rgba(255,255,255,0.5)',
    textBright:'rgba(255,255,255,0.8)',
    close:     '#f59e0b',   // amber
    ma5:       '#fbbf24',   // light amber
    ma10:      '#f97316',   // orange
    ma20:      '#a78bfa',   // violet
    ma60:      '#60a5fa',   // blue
    volUp:     'rgba(255,69,58,0.55)',
    volDown:   'rgba(48,209,88,0.55)',
    tooltipBg: 'rgba(28,28,30,0.95)',
    tooltipBorder:'rgba(255,255,255,0.15)',
  };

  static drawKlineChart(klines) {
    if (!klines || klines.length === 0) {
      console.warn('No kline data');
      return;
    }

    const labels   = klines.map(k => k.date);
    const closes   = klines.map(k => k.close);
    const volumes  = klines.map(k => k.volume || 0);

    const ma5  = this.calcMA(closes, 5);
    const ma10 = this.calcMA(closes, 10);
    const ma20 = this.calcMA(closes, 20);
    const ma60 = this.calcMA(closes, 60);

    // Volume bar colors
    const barColors = klines.map((k, i) => {
      const prev = i > 0 ? klines[i - 1].close : k.open;
      return k.close >= prev ? this.COLOR.volUp : this.COLOR.volDown;
    });
    const barBorders = barColors.map(c => c.replace('0.55', '0.85'));

    if (klineChart) klineChart.destroy();
    if (volumeChart) volumeChart.destroy();

    window._lastKlines = klines;

    // ── Price + MA chart ──
    const ctxP = document.getElementById('kline-chart').getContext('2d');
    klineChart = new Chart(ctxP, {
      type: 'line',
      data: {
        labels,
        datasets: [
          {
            label: I18n.t('chart.close'),
            data: closes,
            borderColor: this.COLOR.close,
            backgroundColor: (ctx) => {
              const g = ctx.chart.ctx.createLinearGradient(0, 0, 0, ctx.chart.height);
              g.addColorStop(0, 'rgba(100,210,255,0.15)');
              g.addColorStop(1, 'rgba(100,210,255,0.0)');
              return g;
            },
            borderWidth: 2,
            fill: true,
            pointRadius: 0,
            pointHoverRadius: 5,
            pointHoverBackgroundColor: this.COLOR.close,
            pointHoverBorderColor: '#fff',
            pointHoverBorderWidth: 2,
            tension: 0.2,
            yAxisID: 'y',
          },
          { label:'MA5',  data:ma5,  borderColor:this.COLOR.ma5,  borderWidth:1.5, borderDash:[],     fill:false, pointRadius:0, tension:0.2, yAxisID:'y' },
          { label:'MA10', data:ma10, borderColor:this.COLOR.ma10, borderWidth:1.5, borderDash:[3,3],  fill:false, pointRadius:0, tension:0.2, yAxisID:'y' },
          { label:'MA20', data:ma20, borderColor:this.COLOR.ma20, borderWidth:1.5, borderDash:[5,2],  fill:false, pointRadius:0, tension:0.2, yAxisID:'y' },
          { label:'MA60', data:ma60, borderColor:this.COLOR.ma60, borderWidth:1.2, borderDash:[8,3],  fill:false, pointRadius:0, tension:0.2, yAxisID:'y' },
        ]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        animation: { duration: 800, easing: 'easeOutQuart' },
        interaction: { mode: 'index', intersect: false },
        plugins: {
          legend: {
            position: 'top',
            align: 'end',
            labels: {
              color: this.COLOR.textBright,
              usePointStyle: true,
              pointStyleWidth: 12,
              padding: 16,
              font: { family: systemFont, size: 11, weight: '500' },
              boxWidth: 16,
              boxHeight: 1,
            }
          },
          tooltip: {
            backgroundColor: this.COLOR.tooltipBg,
            titleColor: this.COLOR.textBright,
            bodyColor: this.COLOR.text,
            borderColor: this.COLOR.tooltipBorder,
            borderWidth: 1,
            cornerRadius: 12,
            padding: 12,
            titleFont: { family: systemFont, weight: '600', size: 12 },
            bodyFont: { family: systemFont, size: 11 },
            callbacks: {
              label: (ctx) => {
                const v = ctx.parsed.y;
                if (v == null || !Number.isFinite(v)) return '';
                return `${ctx.dataset.label}: ¥${v.toFixed(2)}`;
              }
            }
          }
        },
        scales: {
          y: {
            type: 'linear',
            position: 'left',
            grid: { color: this.COLOR.grid },
            ticks: {
              color: this.COLOR.text,
              callback: v => '¥' + (v >= 1000 ? (v/1000).toFixed(2)+'k' : v.toFixed(v<10?2:1)),
              font: { family: systemFont, size: 10 },
              maxTicksLimit: 6,
            },
          },
          x: {
            grid: { color: this.COLOR.grid },
            ticks: {
              color: this.COLOR.text,
              maxTicksLimit: 10,
              autoSkip: true,
              font: { family: systemFont, size: 10 },
            },
          }
        }
      }
    });

    // ── Volume sub-chart ──
    const ctxV = document.getElementById('volume-chart').getContext('2d');
    volumeChart = new Chart(ctxV, {
      type: 'bar',
      data: {
        labels,
        datasets: [{
          label: I18n.t('chart.volume'),
          data: volumes,
          backgroundColor: barColors,
          borderColor: barBorders,
          borderWidth: 0.5,
          borderRadius: 2,
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        animation: { duration: 600, easing: 'easeOutQuart' },
        plugins: {
          legend: { display: false },
          tooltip: {
            backgroundColor: this.COLOR.tooltipBg,
            titleColor: this.COLOR.textBright,
            bodyColor: this.COLOR.text,
            borderColor: this.COLOR.tooltipBorder,
            borderWidth: 1,
            cornerRadius: 12,
            padding: 12,
            callbacks: {
              label: (ctx) => {
                const v = ctx.parsed.y;
                if (v == null || !Number.isFinite(v)) return '';
                const volLabel = I18n.t('chart.volume');
                if (v >= 1e8) return `${volLabel}: ${(v/1e8).toFixed(2)}亿手`;
                if (v >= 1e4) return `${volLabel}: ${(v/1e4).toFixed(1)}万手`;
                return `${volLabel}: ${v}手`;
              }
            }
          }
        },
        scales: {
          y: {
            grid: { color: this.COLOR.grid },
            ticks: {
              color: this.COLOR.text,
              callback: v => v >= 1e8 ? (v/1e8).toFixed(1)+'亿' : v >= 1e4 ? (v/1e4).toFixed(0)+'万' : v,
              maxTicksLimit: 4,
              font: { family: systemFont, size: 9 },
            },
          },
          x: {
            ticks: { display: false },
            grid: { display: false },
          }
        }
      }
    });
  }

  static calcMA(data, period) {
    const r = [];
    for (let i = 0; i < data.length; i++) {
      if (i < period - 1) { r.push(null); continue; }
      const s = data.slice(i - period + 1, i + 1).reduce((a, b) => a + b, 0);
      r.push(Math.round(s / period * 100) / 100);
    }
    return r;
  }

  static formatPrice(p) { return (parseFloat(p) || 0).toFixed(2); }
}

const systemFont = "-apple-system, BlinkMacSystemFont, 'SF Pro Display', 'PingFang SC', 'Helvetica Neue', sans-serif";

// Re-draw on language change
window._onLangChange = () => {
  if (window._lastKlines) ChartManager.drawKlineChart(window._lastKlines);
};
