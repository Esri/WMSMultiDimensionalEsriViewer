//Global Variables.  Need globals because they need to be updated within events that are being fired off
var wmsLayerDimensions = [];
var wmsLayerDimensionValues = [];	
var wmsDimensionsLoadedEvent;
var wmsLayerVisibleLayer = '';
var wmsVersion = '';

/**
 * Threads implements dimensions differently than most of the community (As Far as I can tell) 
 * i.e. they don't use "dim_" in front of dimensnions.  Therefore we need to check if it's
 * a threads server, if so, do something different.
 */
var isThreadsServer = false; 

/**
 *Class Name: WMSLayerWithTime 
 *Notes: Requires a Proxy File to be set up and referenced in the Esri config.
 */		
require([
    "dojo/_base/declare",
    "esri/layers/DynamicMapServiceLayer"
], function(declare, DynamicMapServiceLayer){
    return declare("WMSLayerWithTime", esri.layers.DynamicMapServiceLayer, {
    	    	
	    constructor: function(url) {
	      this.initialExtent = this.fullExtent = new esri.geometry.Extent({xmin:-180,ymin:0,xmax:0,ymax:90,spatialReference:{wkid:4326}});
	      this.spatialReference = new esri.SpatialReference({wkid:4326});
		  
	      this.loaded = true;
	      this.onLoad(this);     
	      this.wmsURL = url;
	      
	      if(url.indexOf('thredds/wms') != -1)
	      	isThreadsServer = true;
	      	
	      this.dimensions = [];
	      this.dimensionValues = [];
	      getWMSDimesionDefinition(url);
	      
	      this.paramsOb = {
	        	request:"GetMap",
	        	transparent:true,
	        	format:"image/png",
	        	bgcolor:"0x000000",
	        	version:"1.1.1", 
	        	layers:"0",
	        	styles: "",
	        	crs:"EPSG:3857", //This may need to be updated
	        	exceptions: "application/vnd.ogc.se_xml"
	      	};
	      
	      //Methods
	      this.getSubLayerWDim = wmsLayerGetSubLayers;
	      this.getDimensionValues = wmsLayerGetDimensionValues;
	      this.getDimensions = 	wmsLayerGetDimensions;
	      this.getDimensionProperties = wmsLayerGetDimensionProperties;
	      this.initializeDimensionParams = wmsLayerInitializeDimensions;
	      
	      //Events
		  wmsDimensionsLoadedEvent = document.createEvent("Event");
		  //We need to let the mapping client know when a point has been selected on the map
		  wmsDimensionsLoadedEvent.initEvent("WMSDimensionsLoaded",true,true);	
	        
	    },
	
	    getImageUrl: function(extent, width, height, callback) {
	      this.paramsOb.bbox = extent.xmin + "," + extent.ymin + "," + extent.xmax + "," + extent.ymax; 
	      this.paramsOb.srs = "EPSG:" + extent.spatialReference.wkid;
	      this.paramsOb.width = width;
	      this.paramsOb.height = height;
	
	      callback(this.wmsURL + "?" + dojo.objectToQuery(this.paramsOb));
        }
    });
}); 

/**
 *Sets the initial dimensions to the default values represented within the get capabilities file.
 * Save the layername as the visible layer.  This only supports one layer being visible at a time.  
 * @param {String} layerName 
 */
function wmsLayerInitializeDimensions(layerName)
{
	
	this.paramsOb.version = wmsVersion;
	
	wmsLayerVisibleLayer = layerName;
	
	//Set the visible Layer
	this.paramsOb.layers = layerName;
	
	var dimensions = wmsLayerGetDimensions(wmsLayerVisibleLayer);
	
	for(index = 0; index < dimensions.length; index++)
	{
		var dimensionName = dimensions[index];
		var dimProps = this.getDimensionProperties(dimensionName);
		this.paramsOb[dimensionName] = dimProps.defaultValue;
	}
}

/**
 * Gets the layer names within the WMS Service.
 */
function wmsLayerGetSubLayers()
{
	return Object.keys(wmsLayerDimensionValues);
}

/**
 *Gets the Layer dimensions as represented within the GetMap Parameters URL 
  * @param {String} layerName Optional: If not provided, the layer that is currently visible 
  * is used
 */
function wmsLayerGetDimensions(layerName)
{
	if(layerName == null)
		layerName = wmsLayerVisibleLayer;
	
	var layerDimensionInfo = wmsLayerDimensionValues[layerName].dimensions;
		
	return Object.keys(layerDimensionInfo);;	
}
/**
 *Gets an array of values of the inputted dimension.  Must use a value from GetDimesions method 
 * @param {String} dimName The dimension name as represented within the getcap file.
 * @param {String} layerName Optional: If not provided, the layer that is currently visible
 */
function wmsLayerGetDimensionValues(dimName,layerName)
{
	if(layerName == null)
		layerName = wmsLayerVisibleLayer;
	
	var layerDimensionInfo = wmsLayerDimensionValues[layerName].dimensions;
			
	return layerDimensionInfo[dimName].values;
}
/**
 *Gets the dimension properties such as the actual name, the units and the default value, represented
 * within the get capabilities file.  
 * @param {Object} dimName
 * @return The Dimesion properties represented as an object with name, unit, & defaultValue properties.
 */
function wmsLayerGetDimensionProperties(dimName,layerName)
{
	if(layerName == null)
		layerName = wmsLayerVisibleLayer;
	
	var layerDimensionInfo = wmsLayerDimensionValues[layerName].dimensions;
		
	var dimProps = [];
	dimProps.name = layerDimensionInfo[dimName].name;
	dimProps.units = layerDimensionInfo[dimName].units;
	dimProps.defaultValue = layerDimensionInfo[dimName].defaultValue;
	
	return dimProps;
}

/**
 *Parses the get capabilities file to figure out the dimension values and properties for a layer
 * @param {Object} wmsURL
 */
function getWMSDimesionDefinition(wmsURL)
{
	// The parameters to pass to xhrGet, the url, how to handle it, and the callbacks.
	//var url = gpTask + "?f=json";
	var dataUrl = wmsURL +  '?request=GetCapabilities&service=WMS';
	
	// The parameters to pass to xhrGet, the url, how to handle it, and the callbacks.
	//Requires a Proxy
	var xhrArgs = {
		url : dataUrl,
		handleAs : "xml",
		//preventCache : true,
		load : function(data) {
			
			//Getting the Version
			var wmsCap = data.getElementsByTagName('WMS_Capabilities');
			wmsVersion = wmsCap[0].attributes.version.textContent;
			
			//TODO: Get the Spatial Information
			
			var layersDom = data.getElementsByTagName('Layer');
			wmsLayerDimensionValues = [];
			for(layersIndex = 0; layersIndex < layersDom.length; layersIndex++)
			{
				var layerDom = layersDom[layersIndex];
				var layerDimensionInfo = wmsLayerCapDimensionParser(layerDom);
				if(layerDimensionInfo.layerName != null) 
				{
					wmsLayerDimensionValues[layerDimensionInfo.layerName] = layerDimensionInfo;
				}
			}
						
			document.dispatchEvent(wmsDimensionsLoadedEvent);
			
		},
		error : function(error) {
			alert("Failed");
		}
	};

	esri.request(xhrArgs);	
}

/**
 *Parses the DOM Node to get the dimension information for the layer 
 * @param {Object} layerDom
 */
function wmsLayerCapDimensionParser(layerDom)
{
	var layerDimensionInfo = [];
	
	var layerChildren = layerDom.children;
	for(childrenIndex = 0; childrenIndex < layerChildren.length; childrenIndex++)
	{
		var tagName = layerChildren[childrenIndex].tagName;
		if(tagName.toLowerCase() == 'name')
		{
			var dimPrefix = '';
			if(!isThreadsServer)//Threads does not implement the dim_ Prefix within WMS
				dimPrefix = "dim_";
				
			layerDimensionInfo.layerName = layerChildren[childrenIndex].textContent;
			layerDimensionInfo.queryIndex = layerDom.attributes.queryable.textContent;;
			layerDimensionInfo.dimensions = [];
			                                
			var dimensionsDom = layerDom.getElementsByTagName('Dimension');
			
			for(index = 0; index < dimensionsDom.length; index++)
			{
				var dimensionName = dimensionsDom[index].attributes.name;
				var wmsDimenProp = dimPrefix + dimensionName.nodeValue;
				//layerDimensionInfo.push(wmsDimenProp);
				var valuesAsString = dimensionsDom[index].textContent;
				var values = valuesAsString.split(",");
				layerDimensionInfo.dimensions[wmsDimenProp] = [];
				layerDimensionInfo.dimensions[wmsDimenProp].values = values;
				layerDimensionInfo.dimensions[wmsDimenProp].defaultValue = dimensionsDom[index].attributes['default'].textContent;
				layerDimensionInfo.dimensions[wmsDimenProp].name = dimensionName.nodeValue;
				layerDimensionInfo.dimensions[wmsDimenProp].units = dimensionsDom[index].attributes['units'].textContent;
			}
			
			break; //We got this layer, time to move onto the next one
		}
	}
	
	return 	layerDimensionInfo;
}
