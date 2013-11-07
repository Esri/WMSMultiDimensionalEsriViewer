var dimField = "depth";
var dimValueField = "value";
var dimActFieldValue = "actvalue";
var dimSlicesTable = null;
var selectedDimSliderIndex = 0;
var dimSelectionAtr = "Selection";
var units = 'meters';
var currentSelectedDimensionValue = -2;

function nDimSlider(dimField,units,defaultValue) {

	//Properties
	this.getDimensionValue = dimSliderGetDimensionValue;
	this.setDimensionField = nDimSliderSetDimensionField;
	this.setDefaultValue = nDimSliderSetDefaultValue;
	this.setDimensionUnits = nDimSliderSetUnits;
	
	//Methods
	this.setSlices = nDimSliderSetDimensionSlices;
	this.createDimensionSlider = nDimSliderCreateEventSlider;
	
	
	//Events
	updateDimSliderEvent = document.createEvent("Event");
	//We need to let the mapping client know when a point has been selected on the map
	updateDimSliderEvent.initEvent("DimSliderDateChanged",true,true);	
}

function nDimSliderSetDimensionField(value)
{
	dimField = value;
}

function nDimSliderSetDefaultValue(value)
{
	currentSelectedDimensionValue = value;
}

function nDimSliderSetUnits(value)
{
	units = value;
}

function nDimSliderSetDimensionSlices(dimensionValues,isDepth)
{
	var slices = [];
	for (index=0;index <  dimensionValues.length;index++)
	{
		var ob = [];
		var value = parseFloat(dimensionValues[index]);
		var invertedDepthValue = value;
		if(isDepth)
			invertedDepthValue = invertedDepthValue * -1;
		
		if(value != 0) //When using a Log D3 chart there is a bug that doesn't let you use 0 values'
		{	
			ob[dimField] = invertedDepthValue;
			ob[dimValueField] = 0;
			ob[dimActFieldValue] = value;
			slices.push(ob);
		}
	}	
	
	dimSlicesTable = slices;
}

/**
 *Adds the Plot Framework to the Application 
 * @param {Object} margin
 * @param {Object} width
 * @param {Object} height
 */
function nDimSliderAddSliderPlot(margin, width, height)
{    	
	var panel= d3.select("#elevationSliderPanel");
	var svg = d3.select("#elevationSliderPanel").append("svg")
		    .attr("width", width + margin.left + margin.right)
		    .attr("height", height + margin.top + margin.bottom)
		  	.append("g")
		    .attr("transform", "translate(" + margin.left + "," + margin.top + ")");
		    
	return svg;
}

/**
 * Creates a Time Series chart as a line graph, and then fills in the area up to the current date. 
 * 
 * @param {Object} features:  All the features that make up the time series (be sure the features have both a value and dimension property)
 */
function nDimSliderCreateEventSlider()
{
	var features = dimSlicesTable;
			
	nDimSliderWidth = getnDimSliderSliderWidth();
	eventSliderHeight = getnDimSliderSliderHeight();
	//var margin = {top: 20, right: 15, bottom: 20, left: 15}, //var margin = {top: 10, right: 1, bottom: 30, left: 50},
	var margin = {top: 25, right: 5, bottom: 5, left: 50},
	width = nDimSliderWidth - margin.left - margin.right; // timeSliderWidth + margin.left + margin.right ; // - 90 - margin.left - margin.right, //880 - margin.left - margin.right, //225 - margin.left - margin.right,
	height = eventSliderHeight - 5; // - margin.top - margin.bottom ; //185 - margin.top - margin.bottom; //300 - margin.top - margin.bottom;
	
	
	//Adding the plot framwork to the application
	var svg = nDimSliderAddSliderPlot(margin, width, height);
	
	//Configuring the Plot
	var x = d3.time.scale().range([0, width]);
	//var y = d3.scale.linear().range([height, 0]);
	//var y = d3.scale.log().domain([-5000,-2]).range([height, 0]);
	var y = d3.scale.log().range([height, 0]);
	var formatSi = d3.format("s");
	
	//var xAxis = d3.svg.axis().scale(x).orient("bottom").ticks(4);
	var yAxis = d3.svg.axis().scale(y).orient("left").ticks(6, d3.format(",.1s"));

	var line = d3.svg.line().x(function(d) {
		return x(0);
	}).y(function(d) {
		return y(d[dimField]);
	});		
	

	x.domain(d3.extent(features, function(d) {
		return 0;
	}));
	
	
	y.domain(d3.extent(features, function(d) {
		return d[dimField];
	})).nice(); 

	//Axis Label
	svg.append("g")
	.attr("class", "y axis").call(yAxis).append("text")
	.attr("transform", "rotate(-90)")
	.attr("y", 6)
	.attr("dy", "-40").style("text-anchor", "end")
	.text(dimField + " (" + units + ")");
	
	//svg.append("path").datum(features).attr("class", "line").attr("d", line);
	
	svg.selectAll(".dsDot")
	.data(features)
	.enter().append("circle")
	.attr("class", "dsDot")
	.attr("r", 2)
	.attr("cx", function(d) { return x(d[dimValueField]); })
	.attr("cy", function(d) { return y(d[dimField]);})
	.on("click",nDimSliderMouseClick)
	.on("mouseover",nDimSliderOnMouseOver)
	.on("mouseout",nDimSliderOnMouseOut) 
	.append("svg:title").text(function(d) {
		return (d[dimField]).toString();
	}); 
	
	
	svg.append("text")
        .attr("x", 0)          
        .attr("y", 0 - (margin.top / 2))
        .attr("id", "Title")
        .attr("text-anchor", "middle")  
        .style("font-size", "14px") 
        .style("text-decoration", "underline")  
        .text(dimField + ": " + currentSelectedDimensionValue.toString()); 
	
  	//We want to highlight the current view of the map
	nDimSliderChangeEventStep();	
}

function getnDimSliderSliderWidth()
{
	totalPossibleWidth = document.getElementById('elevationSliderPanel').offsetWidth;
	
	return totalPossibleWidth * .90;
}

function getnDimSliderSliderHeight()
{
	totalPossibleHeight = document.getElementById('elevationSliderPanel').offsetHeight;
	
	return totalPossibleHeight * .90;	
}

/**
 *This event is fired off when an plot point is clicked.
 * We highlight the point on the chart and send out another event
 * so the map knows to highlight the point. 
 */
function nDimSliderMouseClick(d,i)
{
	selectedDimSliderIndex = i;
	
	nDimSliderChangeEventStep();
	
	document.dispatchEvent(updateDimSliderEvent);
}

/**
 *This event is fired off when an plot point is clicked.
 * We highlight the point on the chart and send out another event
 * so the map knows to highlight the point. 
 */
function nDimSliderOnMouseOver(d,i)
{
	var svg = d3.select("#elevationSliderPanel").select("svg");
	var circles = svg.selectAll(".dsDot");
	var selectedCircle = circles[0][i];	
	
	if(d[dimSelectionAtr])
	{
		selectedCircle.setAttribute("r", 5);
	}
	else
	{
		selectedCircle.setAttribute("r", 3.5);
	}
}

/**
 *This event is fired off when the mouse is no longer hovering
 */
function nDimSliderOnMouseOut(d,i)
{	
	var svg = d3.select("#elevationSliderPanel").select("svg");
	var circles = svg.selectAll(".dsDot");
	var selectedCircle = circles[0][i];	
	
	if(d[dimSelectionAtr])
	{
		selectedCircle.setAttribute("r", 4);
	}
	else
	{
		selectedCircle.setAttribute("r", 2);
	}
	
}



function dimSliderSelectDimStep()
{
	var svg = d3.select("#elevationSliderPanel").select("svg");
	
	var circles = svg.selectAll(".dsDot");
	for(var index = 0; index < circles[0].length; index++)
	{
		var chartDotCircle = circles[0][index];
		
		chartDotCircle.style.fill = "";		
		chartDotCircle.style.stroke = "";
		chartDotCircle.setAttribute("r", 2);
		chartDotCircle.__data__[dimSelectionAtr] = false;
	}
	
	circles[0][selectedDimSliderIndex].style.fill = "cyan";
	circles[0][selectedDimSliderIndex].style.stroke = "black";	
	circles[0][selectedDimSliderIndex].setAttribute("r", 4);	
	circles[0][selectedDimSliderIndex].__data__[dimSelectionAtr] = true;	
	
	currentSelectedDimensionValue = circles[0][selectedDimSliderIndex].__data__[dimActFieldValue];	
	
	var textAll = svg.selectAll("#Title");
	textAll[0][0].textContent = dimField + ": " + currentSelectedDimensionValue.toString();			
}



/**
 *Highlights the selected point and sets the other points back to the original value 
 */
function nDimSliderChangeEventStep()
{
	var svg = d3.select("#elevationSliderPanel").select("svg");
	
	var circles = svg.selectAll(".dsDot");
	var selectedItem = circles[0][selectedDimSliderIndex];
	
	dimSliderSelectDimStep();
}

function dimSliderGetDimensionValue()
{
	return currentSelectedDimensionValue;
}

/**
 * 
 */
function nDimSliderDeleteChart()
{
	var oldSVG = d3.select("#elevationSliderPanel").select("svg");
    if(oldSVG != null)
    	oldSVG.remove();	
}

/**
 * 
 */
function nDimSliderUpdateChartSize()
{
	d3DeleteChart();
	d3CreateEventSlider(timeSlicesTable);
}