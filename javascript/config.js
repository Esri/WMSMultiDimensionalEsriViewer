var config = {
	title : 'Multidimensional netCDF Template',
	description : '',
	loop : true,
	GPTaskService : "http://arcgis-esrifederalsciences-1681685868.us-east-1.elb.amazonaws.com/arcgis/rest/services/201307_GLDAS_Multidimensional/SoilMoistureToTable/GPServer/Make%20NetCDF%20Table%20from%20Point", 
	//Webmap comes with app, but normally not manually specified
	webmap : '32a28a9e495c4de3aaec7d2df789bf8b',//33db038f85944eb6a6c9e2628626b47a', //'56106bdcd93d4c9ab0de78d0c8cdaabd', // '6f8baac7ffb349a38f045ff2ae6c9797', //'56106bdcd93d4c9ab0de78d0c8cdaabd',
	//Below are default values that aren't set by an application'
	appid : '',
	proxy : '',
	arcgisUrl : null
}

//Application configuration specification as needed by ArcGIS Online Item
var _configSpecification = 
{
	"configurationSettings":
	[
		{
			"category":"General Settings",
			"fields":
			[
				{
					"type":"string",
					"fieldName":"title",
					"label":"Title",
					"stringFieldOption":"textbox",
					"placeHolder":""
				}
			]
		},
		{
			"category":"Charting Settings",
			"fields":
			[
				{
					"type":"string",
					"fieldName":"GPTaskService",
					"label":"GP Service",
					"stringFieldOption":"textbox",
					"placeHolder":""
				}
			]
		}
	],
	"values":
	{	
		"title":"",
		"GPTaskService":""
	}
}