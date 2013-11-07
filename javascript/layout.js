dojo.require("esri.map");
dojo.require('esri.dijit.Attribution');
dojo.require("esri.arcgis.utils");
dojo.require("esri.dijit.Scalebar");
dojo.require("esri.dijit.BasemapGallery");
dojo.require("esri.geometry");
dojo.require("esri.geometry.Point");
dojo.require("esri.tasks.geometry");
dojo.require("esri.layers.DynamicMapServiceLayer");
dojo.require("dojo/json");


  var map, urlObject, tb;
  var timeSlider;
  var timeProperties = null;
  var i18n;
  var returnTable = null;
  var transectFeatures = null;
  var mode = "PointMode";
  var esriMapOb = null;
  var eventSliderOb = null;
  var eventSliderTimeChartOb = null;
  var netCDFGPQueryOb = null;
  var dimSliderOb = null;
  var wmsLayer = null;
  var timeDim = '';
  var nDim = '';
    
  
   function initMap() {
   	
   	
     //get the localization strings
  	 i18n = dojo.i18n.getLocalization("esriTemplate","template"); 
       
      
      //read the legend header text from the localized strings file 
      //dojo.byId('legendHeader').innerHTML = i18n.tools.legend.label;

      
      if(configOptions.geometryserviceurl && location.protocol === "https:"){
        configOptions.geometryserviceurl = configOptions.geometryserviceurl.replace('http:','https:');
      }
      esri.config.defaults.geometryService = new esri.tasks.GeometryService(configOptions.geometryserviceurl);  


      if(!configOptions.sharingurl){
        configOptions.sharingurl = location.protocol + '//' + location.host + "/sharing/content/items";
      }
      esri.arcgis.utils.arcgisUrl = configOptions.sharingurl;
       
      if(!configOptions.proxyurl){   
        configOptions.proxyurl = location.protocol + '//' + location.host + "/sharing/proxy.ashx";
      }

      esri.config.defaults.io.proxyUrl =  configOptions.proxyurl;

      esri.config.defaults.io.alwaysUseProxy = false;
      

	urlObject = esri.urlToObject(document.location.href);
	urlObject.query = urlObject.query || {};
	config = utils.applyOptions(config, urlObject.query);

	if(urlObject.query.appid)
	{		
		appRequest = esri.arcgis.utils.getItem(config.appid);

		//getItem provides a deferred object; set onAppData to load when the request completes
		appRequest.then(onAppData);
	}
	else
	{
		setUpMap();
	}        
}
    
function onAppData (result) {

		//The configuration properties are stored in the itemData.values property of the result
		//Update the config variable
		config = utils.applyOptions(config, result.itemData.values);
		//Apply any UI changes
		
		console.log(result.itemData.values);
		
		
		setUpMap();
}

function setUpMap() {
	
  require(["esri/map", "dojo/domReady!"], function(Map) { 
    map = new Map("map", {
      center: [-56.049, 38.485],
      zoom: 3,
      basemap: "streets"
    });
  	});
  	  	
  	var startTime = new Date(2013,02,18,20,0);  	
  	var endTime = new Date(2013,02,18,23,0);  
  	var timeExtent = new esri.TimeExtent();
	timeExtent.startTime = startTime;
	timeExtent.endTime = endTime;
	map.setTimeExtent(timeExtent); 
	    

    
	initUI();     
}

function loadWMS(evt)
{
	//alert("Load WMS");
	var wmsURL = document.getElementById('wmsTextInput').value;	 
	
	//Remove everything after the '?' mark
	var questIndex = wmsURL.indexOf('?');
	if(questIndex != -1)
	{
		wmsURL = wmsURL.substring(0,questIndex);
		document.getElementById('wmsTextInput').value = wmsURL;
	}
		 
	wmsLayer = new WMSLayerWithTime(wmsURL);
    document.addEventListener("WMSDimensionsLoaded",wmsLoaded,false);
}

/**
 *Once the WMS has been parsed and ready to load, we can add it to the map and update the
 *dimension sliders 
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
		
		var layerSelecterDiv = document.getElementById('layerSelector');
		layerSelecterDiv.style.visibility = 'visible';
	}
	else
	{
		alert("Web Map Service loaded does not have any multi-dimensional layers contained within it.");
	}
}

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
  		//domStyle.set(footerElem, 'visibility', 'visible');
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
	//spashConElem.style.visibility = 'hidden';	
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

function initUI() {
	        
    //add chrome theme for popup
    dojo.addClass(map.infoWindow.domNode, "chrome");   		
  }

function updateDimension()
{
	var dimensionValue = dimSliderOb.getDimensionValue();
	//alert(dimensionValue.toString());
	//Currently the values are converted to negative so we need to convert them back
	//dimensionValue = dimensionValue; // * -1;
	
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