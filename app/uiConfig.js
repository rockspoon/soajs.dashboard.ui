"use strict";
/**
 * Custom configuration values
 */
var _soajsStore = "https://www.soajs.io/store";

var protocol = window.location.protocol;

var mydomain = "localhost:4000";

//set the key
var myKey = "9b96ba56ce934ded56c3f21ac9bdaddc8ba4782b7753cf07576bfabcace8632eba1749ff1187239ef1f56dd74377aa1e5d0a1113de2ed18368af4b808ad245bc7da986e101caddb7b75992b14d6a866db884ea8aee5ab02786886ecf9f25e974";

var titlePrefix = "SOAJS";
var themeToUse = "default";
var whitelistedDomain = ['localhost', '127.0.0.1', mydomain];
var apiConfiguration = {
	domain: window.location.protocol + '//' + mydomain,
	key: myKey
};

var SOAJSRMS = ['soajs.controller','soajs.urac','soajs.oauth','soajs.dashboard','soajs.prx','soajs.gcs'];
var KUBERNETES_SYSTEM_DEPLOYMENTS = [ 'kube-dns', 'kube-proxy', 'kube-apiserver', 'kube-scheduler', 'kube-controller-manager', 'kube-flannel-ds' ];
var soajsAppModules = ['ui.bootstrap', 'ui.bootstrap.datetimepicker', 'ui.select', 'luegg.directives', 'angular-sortable-view', 'ngRoute', 'ngCookies', 'ngStorage', 'textAngular', "ngFileUpload", "swaggerUi", "ui.ace", "ngCkeditor", "chart.js"];

var modules = {
	"develop": {
		"dashboard": {
			services: 'modules/dashboard/services/install.js',
			endpoints: 'modules/dashboard/endpoints/install.js',
			githubApp: 'modules/dashboard/gitAccounts/install.js',
			swaggerEditorApp: 'modules/dashboard/swaggerEditor/install.js',
			catalogs: 'modules/dashboard/catalogs/install.js',
			ci: 'modules/dashboard/ci/install.js',
			cd: 'modules/dashboard/cd/install.js',
			templates: 'modules/dashboard/templates/install.js',
			importExport: 'modules/dashboard/importExport/install.js',
			infra: 'modules/dashboard/infra/install.js'
		}
	},
	"manage": {
		"dashboard": {
			productization: 'modules/dashboard/productization/install.js',
			multitenancy: 'modules/dashboard/multitenancy/install.js',
			members: 'modules/dashboard/members/install.js'
		}
	},
	"deploy": {
		"dashboard": {
			environments: 'modules/dashboard/environments/install.js',
			resources: 'modules/dashboard/resources/install.js',
			secrets: 'modules/dashboard/secrets/install.js'
		}
	},
	"common": {
		"dashboard": {
			myAccount: 'modules/dashboard/myAccount/install.js'
		}
	}
};

var whitelistedRepos = [
	'soajs/soajs.examples',
	'soajs/soajs.jsconf',
	'soajs/soajs.artifact',
	'soajs/soajs.quick.demo',
	'soajs/soajs.nodejs.express',
	'soajs/soajs.nodejs.hapi',
	'soajs/soajs.java.jaxrs_jersey',
	'soajs/soajs.golang.mux'
];
