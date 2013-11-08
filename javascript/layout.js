dojo.require("esri.map");
dojo.require('esri.dijit.Attribution');
dojo.require("esri.arcgis.utils");
dojo.require("esri.dijit.Scalebar");
dojo.require("esri.dijit.BasemapGallery");
dojo.require("esri.layers.DynamicMapServiceLayer");
dojo.require("dojo/json");

//GLOBALS
  var map;
  var eventSliderOb = null;
  var dimSliderOb = null;
  var wmsLayer = null;
  var timeDim = '';
  var nDim = '';
    
/**
 *Fires off when the web pages is loaded 
 */  
function initMap() {
   	
    esri.config.defaults.io.proxyUrl =  location.protocol + '//' + location.host + "/sharing/proxy.ashx";
    esri.config.defaults.io.alwaysUseProxy = false;
      	
  	require(["esri/map", "dojo/domReady!"], function(Map) { 
    map = new Map("map", {
      center: [-56.049, 38.485],
      zoom: 3,
      basemap: "oceans"
    });
  	});
  	      
	//add chrome theme for popup.  
    dojo.addClass(map.infoWindow.domNode, "chrome");    
}

/**
 *Fires off when user click the load WMS button.
 *Once clicked we parse the GetCapabilities file of the URL entered
 * for the necessary information to use for the GetMap request
 */
function loadWMS(evt)
{
	//Get the URL the user added to the Form within the splash screen
	var wmsURL = document.getElementById('wmsTextInput').value;	 
	
	//Remove everything after the '?' mark
	var questIndex = wmsURL.indexOf('?');
	if(questIndex != -1)
	{
		wmsURL = wmsURL.substring(0,questIndex);
		document.getElementById('wmsTextInput').value = wmsURL;
	}
	
	//We use an event listener to let us know that we have querried the getcapabilities file
	//and parsed all the necessary information out.	 
	wmsLayer = new WMSLayerWithTime(wmsURL);
    document.addEventListener("WMSDimensionsLoaded",wmsLoaded,false);
}

/**
 *Once the WMS has been parsed and ready to load we can let the user
 * know which layers and dimensions can be displayed
 */
function wmsLoaded()
{
	//Set Initial Values
	var subLayers = wmsLayer.getSubLayerWDim();
	if(subLayers.length > 0)
	{
		var groupElement = document.getElementById('radioButtonGroup');
		//Removing all old Radio Boxes
		groupElement.innerHTML = '';
		
		//Adding a radio button for each layer that contains at least one dimension
		for(layerIndex = 0; layerIndex < subLayers.length; layerIndex++)
		{
			var layerName = subLayers[layerIndex];
			
			var dimensions = wmsLayer.getDimensions(layerName);
			
			if(dimensions.length != 0)
			{
				var dimNames = "&nbsp;&nbsp;(" + dimensions.toString() + ")";

				var label = document.createElement("label");
	            var element = document.createElement("input");
	            element.setAttribute("type", "radio");
	            element.setAttribute("value", layerName);
	            element.setAttribute("name", 'rbGroup');
	            element.setAttribute("id", 'rb' + layerName);
	            element.style = 'margin:5px;';
	            if (layerIndex==0)
	              element.setAttribute("checked", true);

				label.appendChild(element);
            	label.innerHTML += layerName + dimNames;
            	label.innerHTML += '<br />';            
            	groupElement.appendChild(label);
           }
		}
		
		//Display the layerSelector
		var layerSelecterDiv = document.getElementById('layerSelector');
		layerSelecterDiv.style.visibility = 'visible';
	}
	else
	{
		alert("Web Map Service loaded does not have any multi-dimensional layers contained within it.");
	}
}

/**
 *Fired off when user clicks Add WMS Layer button  
 * Add the selected layer to the map, then add the dimensions values
 * to the charts
 */
function addWMSLayer()
{
	//Get Selected Layer
	var selLayer = '';
	var elements = document.getElementsByName('rbGroup');
	for(elemIndex = 0 ; elemIndex < elements.length; elemIndex++)
	{
		var element = elements[elemIndex];
		if(element.checked)
		{
			selLayer = element.value;
			break;
		}
	}
	
	//INitialize the WMS Layer with the default dimension values
	wmsLayer.initializeDimensionParams(selLayer);
	map.addLayer(wmsLayer);
	
    
    //Get Dimension Values from WMS Layer
    var dimensions = wmsLayer.getDimensions();
    
    if(dimensions.length > 2)
    	alert("More than two dimensions represented within WMS Service.  Only the \"time\" and one other dimension can be represented");
    
    timeDim = '';
    nDim = '';
    for(index = 0; index < dimensions.length; index++)
    {
    	var dim = dimensions[index];
    	if(dim.indexOf("time") != -1 || dim.indexOf("date") != -1 )
    		timeDim = dim;
    	else
    		nDim = dim;
    }
    
    require(["dojo/dom-style"], function(domStyle){
    //Only show the Time/Event Slider when there is a time dimension
    if(timeDim != '')
    {
    	if(eventSliderOb == null)
    	{
    		eventSliderOb = new EventSlider();
    		document.addEventListener("EventSliderDateChanged",updateMapTime,false);
    	}
    
    	var timeValues = wmsLayer.getDimensionValues(timeDim);
    	eventSliderOb.setTimeSlices(timeValues);
    	eventSliderOb.generateChart();
    	
    	//Show the Event Slider.
    	var footerElem = document.getElementById('footer');
    	footerElem.style.visibility = 'visible';
    }
    
    //Only show the n Dim Slider when there is a dimension other than time
    if(nDim != '')
    {
    	if(dimSliderOb == null)
    	{
    		dimSliderOb = new nDimSlider();
    		document.addEventListener("DimSliderDateChanged",updateDimension,false);
    	}
    	var dimValues = wmsLayer.getDimensionValues(nDim);
    	
    	var dimParams = wmsLayer.getDimensionProperties(nDim);
    	dimSliderOb.setDimensionField(nDim);
    	dimSliderOb.setDimensionUnits(dimParams.units);
    	dimSliderOb.setDefaultValue(dimParams.defaultValue);
    	
    	//We want to check if it's a depth value, because then the dim slider inverses the values'
    	var isDepthValue = false;
    	if(nDim.toLowerCase().indexOf('depth') != -1)
    		isDepthValue = true;
    		
    	dimSliderOb.setSlices(dimValues,isDepthValue);
    	dimSliderOb.createDimensionSlider();
    	
    	//Show the Dimension Slider.
    	var leftChartElem = document.getElementById('leftChart');
  		leftChartElem.style.visibility = 'visible';
    }
    
    	//Now that the application is fully loaded, we can hide the load form.
    	var spashConElem = document.getElementById('splashCon');
  		domStyle.set(spashConElem, 'display', 'none');
	});
}

function resetLayout(){
	if(eventSliderOb != null){
		//When the application is rezied, we want to refresh the graph
		eventSliderOb.updateChartSize();
	}	
}

var utils = {
	applyOptions : function(configVariable, newConfig) {
		var q;

		//Override any config options with query parameters
		for (q in newConfig) {
			configVariable[q] = newConfig[q];
		}
		return configVariable;
	},
	mapResize : function(mapNode) {
		//Have the map resize on a window resize
		dojo.connect(dijit.byId('map'), 'resize', map, map.resize);
	},
	onError : function(error) {
		console.log('Error occured');
		console.log(error);
	}
};	



function updateDimension()
{
	//Gets the current selected dimension value from the Dimension Slider
	var dimensionValue = dimSliderOb.getDimensionValue();
	
	//Update with dimension from WMS Layer
	wmsLayer.paramsOb[nDim] = dimensionValue.toString();
	wmsLayer.refresh();
}

function animationShow(ob)
{
	//graphingWidget.style.top = '130px';
}  

function animationHide(ob)
{
	//graphingWidget.style.top = '60px';
}    
  
  function updateAnimationWidget(dateTime)
  {
	  	animationDateTimeLabel.textContent = dateTime.toDateString(); 
		  	 	
  	 	if(eventSliderOb.isSlidersLastSpot()) 
  	 		animForwardBtn.disabled = true;
  	 	else
  	 		animForwardBtn.disabled = false;
  	 		
  	 	if(eventSliderOb.isSlidersFirstSpot())
  	 		animBackwordBtn.disabled = true;
  	 	else
  	 		animBackwordBtn.disabled = false;  	
  }
  
  /***
   * Event Handler Listener function for when the Event Sliders Date Changes. 
   * We want to update our Animation Widgets Date to be the same as the Event Slider
   * Also Enable/Disable the Animation buttons depending on where we are at within the
   * Event Slider.  For example disable the Forward button when we are at the last event
   * within the map.
   */
  function updateMapTime()
  {
  	 if(eventSliderOb != null)
  	 {
  	 	//dateTime = eventSliderOb.getDateTime();
		var dateTimeStr = eventSliderOb.getDateTimeInitialValue();
		
		//Upate with date time parameter
		wmsLayer.paramsOb[timeDim] = dateTimeStr;
		wmsLayer.refresh();
		  	 	
  	 	updateAnimationWidget(dateTime);
  	 }
  }
  /**
 *Move the Event Slider to the next event. 
 */
function animationGoForward()
{
	if(eventSliderOb != null)
	{
		eventSliderOb.moveSliderForward();
	}
}
/**
 *Move the Event Slider to the previous event. 
 */
function animationGoBackward()
{
	if(eventSliderOb != null)
	{
		eventSliderOb.moveSliderBackward();
	}
}

/**
 *Animates through all the events.
 */
function animationPlay()
{
	if(eventSliderOb != null)
	{
		eventSliderOb.playButtonClicked();
		
		var playButton = document.getElementById('animPlayBtn');
		var img = playButton.children[0];
		
		
		if(eventSliderOb.isPlayActive())
			img.src = "./images/Button-Pause-16.png";
		else
			img.src = "./images/Button-Play-16.png";
		
	}
}