// The desktop chart is the production SVG. Mobile uses the same plotted values,
// remapped horizontally, with readable labels and the full history in view.
export function responsiveCharts(html, periods = []) {
  return html.replace(/<svg viewBox="0 0 660 260"[\s\S]*?<\/svg>/g, svg => {
    const monthly=svg.includes('<rect ');
    const sourceRight=monthly?642:592, targetRight=monthly?338:288;
    const scale=(targetRight-36)/(sourceRight-60);
    const x=value=>(36+(Number(value)-60)*scale).toFixed(2);
    let mobile=svg.replace('viewBox="0 0 660 260"','class="v7-chart-mobile" viewBox="0 0 350 260"')
      .replace(/\b(x|x1|x2|cx)="([\d.]+)"/g,(_,attr,value)=>`${attr}="${x(value)}"`)
      .replace(/points="([^"]+)"/g,(_,points)=>`points="${points.split(' ').map(p=>{const [xx,yy]=p.split(',');return `${x(xx)},${yy}`;}).join(' ')}"`)
      .replace(/font-size="(?:9|10)"/g,'font-size="11"');
    mobile=mobile.replace(/text-anchor="end">([+−]?[\d.]+)%<\/text>/g,(_,value)=>`text-anchor="end">${value.replace('+','').replace('.0','')}%</text>`);
    if(monthly) mobile=mobile.replace(/(<rect[^>]+)width="([\d.]+)"/g,(_,prefix,width)=>`${prefix}width="${(Number(width)*scale).toFixed(2)}"`);
    let i=0;
    const labels=[...mobile.matchAll(/<text[^>]+y="250"[^>]*>[^<]*<\/text>/g)];
    mobile=mobile.replace(/<text[^>]+y="250"[^>]*>[^<]*<\/text>/g,label=>{
      const index=i++;
      if(index!==0 && index!==labels.length-1)return '';
      if(monthly) {
        const period=index===0?periods[0]:periods.at(-1);
        const year=period?` ${period.slice(0,4)}`:'';
        return label.replace('text-anchor="middle"',`text-anchor="${index===0?'start':'end'}"`).replace('</text>',`${year}</text>`);
      }
      return label;
    });
    // Keep the endpoint labels readable; horizontal scaling only affects their placement.
    mobile=mobile.replace(/(<g class="chart-end-label"[\s\S]*?<text )x="[\d.]+"/g,'$1x="296"');
    return svg.replace('<svg ','<svg class="v7-chart-desktop" ')+mobile;
  });
}
