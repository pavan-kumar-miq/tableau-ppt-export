# PptxGenJS Options Verification Report

This document verifies that all options used in the codebase are supported by PptxGenJS v4.0.1.

## Chart Options Used

### General Chart Options (from `getChartOptions`)
- ✅ `x`, `y`, `w`, `h` - Position and size (SUPPORTED)
- ✅ `title` - Chart title (SUPPORTED)
- ✅ `showTitle` - Show chart title (SUPPORTED)
- ✅ `showLegend` - Show legend (SUPPORTED)
- ✅ `legendPos` - Legend position: 'b', 'tr', 'l', 'r', 't' (SUPPORTED)
- ✅ `legendFontSize` - Legend font size (SUPPORTED)
- ✅ `legendColor` - Legend color (SUPPORTED)
- ✅ `showDataTable` - Show data table (SUPPORTED)
- ✅ `showLabel` - Show data labels (SUPPORTED)
- ✅ `showValue` - Show data values (SUPPORTED)
- ✅ `showPercent` - Show percentages (SUPPORTED)
- ✅ `chartColors` - Array of hex colors (SUPPORTED)
- ✅ `chartArea` - Chart area options (SUPPORTED)
- ✅ `plotArea` - Plot area options (SUPPORTED)

### Bar Chart Specific Options (from `getBarChartOptions`)
- ✅ `barDir` - Bar direction: 'bar' or 'col' (SUPPORTED)
- ✅ `barGrouping` - 'clustered', 'stacked', 'percentStacked' (SUPPORTED)
- ✅ `barGapWidthPct` - Gap width percentage 0-500 (SUPPORTED)
- ✅ `barOverlapPct` - Overlap percentage -100 to 100 (SUPPORTED)

### Line Chart Specific Options (from `getLineChartOptions`)
- ✅ `lineSize` - Line thickness 0-256 (SUPPORTED)
- ✅ `lineSmooth` - Smooth/curved lines (SUPPORTED)
- ✅ `lineDataSymbol` - Symbol type (SUPPORTED)
- ✅ `lineDataSymbolSize` - Symbol size 1-256 (SUPPORTED)
- ✅ `displayBlanksAs` - 'span' or 'gap' (SUPPORTED)

### Axis Configuration Options
- ⚠️ `valAxes` - Array of value axis configs (NEEDS VERIFICATION)
  - `showValAxisTitle` - (SUPPORTED)
  - `valAxisTitle` - (SUPPORTED)
  - `valAxisTitleFontSize` - (SUPPORTED)
  - `valAxisTitleColor` - (SUPPORTED)
  - `valAxisLabelFontSize` - (SUPPORTED)
  - `valAxisLabelColor` - (SUPPORTED)
  - `valAxisDisplayUnit` - (SUPPORTED)
  - `valAxisDisplayUnitLabel` - (SUPPORTED)
  - `valAxisLabelFormatCode` - (SUPPORTED)
  - `valGridLine` - (SUPPORTED)
  - `valAxisLineShow` - (SUPPORTED)

- ⚠️ `catAxes` - Array of category axis configs (NEEDS VERIFICATION)
  - `catAxisTitle` - (SUPPORTED)
  - `catAxisLabelFontSize` - (SUPPORTED)
  - `catAxisLabelColor` - (SUPPORTED)
  - `catAxisLineColor` - (SUPPORTED)
  - `catAxisHidden` - (SUPPORTED)

- ⚠️ `catAxisLabelFontSize` - Global category axis label size (NEEDS VERIFICATION)
- ⚠️ `catAxisLabelColor` - Global category axis label color (NEEDS VERIFICATION)
- ⚠️ `catGridLine` - Global category grid line (NEEDS VERIFICATION)
- ⚠️ `catAxisLineColor` - Global category axis line color (NEEDS VERIFICATION)

### Bar Config Options (used in combo charts)
- ✅ `seriesField` - Field name for series data (CUSTOM - used internally)
- ✅ `seriesName` - Series display name (CUSTOM - used internally)
- ✅ `chartColors` - Array of colors (SUPPORTED)
- ✅ `barGapWidthPct` - Gap width (SUPPORTED)
- ✅ `showValue` - Show values (SUPPORTED)
- ⚠️ `dataLabelPosition` - Position: 'outEnd', 'inEnd', 'ctr', etc. (NEEDS VERIFICATION)
- ⚠️ `dataLabelFontSize` - Data label font size (NEEDS VERIFICATION)
- ⚠️ `dataLabelColor` - Data label color (NEEDS VERIFICATION)

### Line Config Options (used in combo charts)
- ✅ `seriesField` - Field name for series data (CUSTOM - used internally)
- ✅ `seriesName` - Series display name (CUSTOM - used internally)
- ✅ `chartColors` - Array of colors (SUPPORTED)
- ✅ `lineSize` - Line thickness (SUPPORTED)
- ✅ `lineSmooth` - Smooth lines (SUPPORTED)
- ✅ `lineDataSymbol` - Symbol type (SUPPORTED)
- ✅ `showValue` - Show values (SUPPORTED)
- ✅ `showLabel` - Show labels (SUPPORTED)
- ⚠️ `secondaryValAxis` - Secondary value axis (NEEDS VERIFICATION)
- ⚠️ `secondaryCatAxis` - Secondary category axis (NEEDS VERIFICATION)

## Issues Found

### 1. `_customDataLabels` in ppt-builder.util.js ✅ FIXED
- **Location**: `src/utils/ppt-builder.util.js:158`
- **Issue**: `_customDataLabels` is not a documented PptxGenJS option
- **Status**: ✅ REMOVED - Code has been cleaned up

### 2. Data Label Options in Bar Config
- **Options**: `dataLabelPosition`, `dataLabelFontSize`, `dataLabelColor`
- **Status**: ⚠️ NEEDS VERIFICATION - These may need to be in the chart-level options, not bar-specific options for combo charts

### 3. Secondary Axis Options
- **Options**: `secondaryValAxis`, `secondaryCatAxis`
- **Status**: ⚠️ NEEDS VERIFICATION - For combo charts, secondary axes may need different configuration

## Recommendations

1. **Remove `_customDataLabels` reference** from `ppt-builder.util.js` if not needed
2. **Verify axis configuration** - PptxGenJS may require axis options at chart level, not nested in arrays
3. **Test data label options** - Ensure `dataLabelPosition`, `dataLabelFontSize`, `dataLabelColor` work in combo charts
4. **Document custom options** - Options like `seriesField` and `seriesName` are custom/internal and should be documented

## Next Steps

1. Test chart generation with current options
2. Check PptxGenJS v4.0.1 documentation for exact option names
3. Update code if any options are unsupported or incorrectly named
4. Add validation/warnings for unsupported options

