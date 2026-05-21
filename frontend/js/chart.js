/**
 * Chart Module
 * Handles Chart.js integration for K-line visualization
 */

let klineChart = null;

class ChartManager {
  /**
   * Initialize and draw K-line chart
   */
  static drawKlineChart(klines) {
    const ctx = document.getElementById('kline-chart').getContext('2d');
    
    // Prepare data for Chart.js
    const labels = klines.map(k => k.date);
    const openPrices = klines.map(k => k.open);
    const closePrices = klines.map(k => k.close);
    const highPrices = klines.map(k => k.high);
    const lowPrices = klines.map(k => k.low);

    // Calculate moving averages for trend lines
    const ma5 = this.calculateMA(closePrices, 5);
    const ma10 = this.calculateMA(closePrices, 10);

    // Destroy existing chart if it exists
    if (klineChart) {
      klineChart.destroy();
    }

    klineChart = new Chart(ctx, {
      type: 'line',
      data: {
        labels,
        datasets: [
          {
            label: '收盘价',
            data: closePrices,
            borderColor: '#3b82f6',
            borderWidth: 2,
            fill: false,
            pointRadius: 2,
            pointBackgroundColor: '#3b82f6',
            tension: 0.1,
            yAxisID: 'y'
          },
          {
            label: 'MA5',
            data: ma5,
            borderColor: '#f59e0b',
            borderWidth: 1,
            borderDash: [5, 5],
            fill: false,
            pointRadius: 0,
            tension: 0.1,
            yAxisID: 'y'
          },
          {
            label: 'MA10',
            data: ma10,
            borderColor: '#ef4444',
            borderWidth: 1,
            borderDash: [5, 5],
            fill: false,
            pointRadius: 0,
            tension: 0.1,
            yAxisID: 'y'
          },
          {
            label: '最高价',
            data: highPrices,
            borderColor: 'rgba(16, 185, 129, 0.3)',
            borderWidth: 1,
            fill: false,
            pointRadius: 0,
            yAxisID: 'y'
          },
          {
            label: '最低价',
            data: lowPrices,
            borderColor: 'rgba(239, 68, 68, 0.3)',
            borderWidth: 1,
            fill: false,
            pointRadius: 0,
            yAxisID: 'y'
          }
        ]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        interaction: {
          mode: 'index',
          intersect: false
        },
        plugins: {
          legend: {
            position: 'top',
            labels: {
              usePointStyle: true,
              padding: 15
            }
          },
          title: {
            display: true,
            text: 'K 线走势图'
          }
        },
        scales: {
          y: {
            type: 'linear',
            position: 'left',
            title: {
              display: true,
              text: '价格'
            }
          },
          x: {
            title: {
              display: true,
              text: '日期'
            }
          }
        }
      }
    });
  }

  /**
   * Calculate moving average
   */
  static calculateMA(data, period) {
    const result = [];
    for (let i = 0; i < data.length; i++) {
      if (i < period - 1) {
        result.push(null);
      } else {
        const sum = data.slice(i - period + 1, i + 1).reduce((a, b) => a + b, 0);
        result.push(sum / period);
      }
    }
    return result;
  }

  /**
   * Format price for display
   */
  static formatPrice(price) {
    return parseFloat(price).toFixed(2);
  }
}
