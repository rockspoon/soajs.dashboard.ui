"use strict";
var templateService = soajsApp.components;
templateService.service('templateSrv', ['Upload', 'ngDataApi', '$timeout', '$cookies', '$window', 'detectBrowser', function (Upload, ngDataApi, $timeout, $cookies, $window, detectBrowser) {
	
	function listTemplates(currentScope) {
		overlayLoading.show();
		getSendDataFromServer(currentScope, ngDataApi, {
			'method': 'get',
			'routeName': '/dashboard/templates',
			'params': {
				'fullList': true,
			},
		}, function (error, response) {
			overlayLoading.hide();
			if (error) {
				currentScope.displayAlert('danger', error.message);
			} else {
				if (response) {
					currentScope.templates = angular.copy(response);
					currentScope.oldStyle = false;
					currentScope.templates.forEach(function (oneRecipe) {
						if (oneRecipe.type === '_BLANK') {
							currentScope.oldStyle = true;
						}
					});
				}
				else {
					currentScope.displayAlert('danger', 'No templates found!');
				}
			}
		});
	}
	
	function upgradeTemplates(currentScope) {
		overlayLoading.show();
		getSendDataFromServer(currentScope, ngDataApi, {
			'method': 'get',
			'routeName': '/dashboard/templates/upgrade'
		}, function (error) {
			overlayLoading.hide();
			if (error) {
				currentScope.displayAlert('danger', error.message);
			} else {
				currentScope.displayAlert('success', 'Templates Upgraded');
				currentScope.listTemplates();
			}
		});
	}
	
	function deleteTmpl(currentScope, oneTemplate) {
		overlayLoading.show();
		getSendDataFromServer(currentScope, ngDataApi, {
			'method': 'delete',
			'routeName': '/dashboard/templates',
			'params': {
				'id': oneTemplate._id,
			},
		}, function (error) {
			overlayLoading.hide();
			if (error) {
				currentScope.displayAlert('danger', error.message);
			} else {
				currentScope.displayAlert('success', "Template Deleted Successfully");
				currentScope.listTemplates();
			}
		});
	}
	
	function uploadTemplate(currentScope, input, cb) {
		//to avoid incompatibiltiy issues when using safari browsers
		if (!input) {
			return false;
		}
		
		let soajsauthCookie = $cookies.get('soajs_auth', {'domain': interfaceDomain});
		let dashKeyCookie = $cookies.get('soajs_dashboard_key', {'domain': interfaceDomain});
		let access_token = $cookies.get('access_token', {'domain': interfaceDomain});
		
		let progress = {value: 0};
		
		let options = {
			url: apiConfiguration.domain + "/dashboard/templates/import",
			params: {
				filename: input.name,
				access_token: access_token
			},
			file: input,
			headers: {
				'soajsauth': soajsauthCookie,
				'key': dashKeyCookie
			}
		};
		overlayLoading.show();
		Upload.upload(options).progress(function (evt) {
			let progressPercentage = parseInt(100.0 * evt.loaded / evt.total);
			progress.value = progressPercentage;
		}).success(function (response, status, headers, config) {
			overlayLoading.hide();
			if (!response.result) {
				response.errors.details.forEach((oneError) => {
					currentScope.$parent.displayAlert('danger', oneError.code + " => " + oneError.message);
				});
			}
			else {
				if (response.data && Array.isArray(response.data) && response.data[0].code && response.data[0].msg) {
					//template contains errors that needs fixing
					fixTemplateProblems(currentScope, response.data, cb);
				}
				else {
					return cb();
				}
			}
		}).error(function () {
			overlayLoading.hide();
			currentScope.$parent.displayAlert('danger', "An Error Occurred while uploading your template, please try again.");
		});
	}
	
	function fixTemplateProblems(currentScope, issues, cb) {
		delete currentScope.form;
		currentScope.alerts = null;
		currentScope.step = 2;
		
		let unrecoverable = [];
		issues.forEach((oneIssue) => {
			if (oneIssue.msg.indexOf("=>") === -1 || !oneIssue.entry) {
				unrecoverable.push(oneIssue);
			}
		});
		
		if (unrecoverable.length > 0) {
			currentScope.alerts = unrecoverable;
			currentScope.importForm();
		}
		else {
			let templateId = issues[0].msg.split("=>")[1].trim();
			issues.shift();
			
			let data = {};
			let formEntries = [
				{
					"type": "group",
					"name": "ci",
					"label": "Continuous Integration Recipes",
					"entries": []
				},
				{
					"type": "group",
					"name": "catalogs",
					"label": "Catalog Deployment Recipes",
					"entries": []
				},
				{
					"type": "group",
					"name": "endpoints",
					"label": "Endpoints",
					"entries": []
				}
			];
			
			for (let count = 0; count < issues.length; count++) {
				let oneIssue = issues[count];
				switch (oneIssue.entry.type) {
					case 'ci':
						formEntries[0].entries.push({
							"type": "text",
							"name": oneIssue.entry.type + "_" + count,
							"label": "Recipe: " + oneIssue.entry.name,
							"value": oneIssue.entry.name,
							"fieldMsg": "<span class='red'>Error " + oneIssue.code + ": " + oneIssue.msg.split("=>")[0] + "</span>",
							"tooltip": "Change the value of this entry to update your imported template",
							"onAction": function (id, value, form) {
								let fieldMsg;
								if (value !== oneIssue.entry.name) {
									fieldMsg = "<span class='green'>Fixed!</span>";
								}
								else {
									fieldMsg = "<span class='red'>Error " + oneIssue.code + ": " + oneIssue.msg.split("=>")[0] + "</span>";
								}
								
								form.entries.forEach((oneGroup) => {
									if (oneGroup.name === "ci") {
										oneGroup.entries.forEach((oneInput) => {
											if (oneInput.name === oneIssue.entry.type + "_" + count) {
												oneInput.fieldMsg = fieldMsg;
											}
										});
									}
								});
							}
						});
						
						data [oneIssue.entry.type + "_" + count] = oneIssue.entry.name;
						break;
					case 'catalogs':
						formEntries[1].entries.push({
							"type": "text",
							"name": oneIssue.entry.type + "_" + count,
							"label": "Catalog: " + oneIssue.entry.name,
							"value": oneIssue.entry.name,
							"fieldMsg": "<span class='red'>Error " + oneIssue.code + ": " + oneIssue.msg.split("=>")[0] + "</span>",
							"tooltip": "Change the value of this entry to update your imported template",
							"onAction": function (id, value, form) {
								let fieldMsg;
								if (value !== oneIssue.entry.name) {
									fieldMsg = "<span class='green'>Fixed!</span>";
								}
								else {
									fieldMsg = "<span class='red'>Error " + oneIssue.code + ": " + oneIssue.msg.split("=>")[0] + "</span>";
								}
								
								form.entries.forEach((oneGroup) => {
									if (oneGroup.name === "catalogs") {
										oneGroup.entries.forEach((oneInput) => {
											if (oneInput.name === oneIssue.entry.type + "_" + count) {
												oneInput.fieldMsg = fieldMsg;
											}
										});
									}
								});
							}
						});
						
						data [oneIssue.entry.type + "_" + count] = oneIssue.entry.name;
						break;
					case 'endpoints':
						formEntries[2].entries.push({
							"type": "text",
							"name": oneIssue.entry.type + "_name_" + count,
							"label": "Endpoint: " + oneIssue.entry.name,
							"value": oneIssue.entry.name,
							"fieldMsg": "<span class='red'>Error " + oneIssue.code + ": " + oneIssue.msg.split("=>")[0] + "</span>",
							"tooltip": "Change the value of this entry to update your imported template",
							"onAction": function (id, value, form) {
								let fieldMsg;
								if (value !== oneIssue.entry.name) {
									fieldMsg = "<span class='green'>Fixed!</span>";
								}
								else {
									fieldMsg = "<span class='red'>Error " + oneIssue.code + ": " + oneIssue.msg.split("=>")[0] + "</span>";
								}
								
								form.entries.forEach((oneGroup) => {
									if (oneGroup.name === "endpoints") {
										oneGroup.entries.forEach((oneInput) => {
											if (oneInput.name === oneIssue.entry.type + "_name_" + count) {
												oneInput.fieldMsg = fieldMsg;
											}
											
											if (oneInput.name === oneIssue.entry.type + "_port_" + count) {
												oneInput.fieldMsg = fieldMsg;
											}
										});
									}
								});
							}
						});
						data [oneIssue.entry.type + "_name_" + count] = oneIssue.entry.name;
						
						formEntries[2].entries.push({
							"type": "number",
							"name": oneIssue.entry.type + "_port_" + count,
							"label": "Endpoint Port",
							"value": oneIssue.entry.port,
							"fieldMsg": "<span class='red'>Error " + oneIssue.code + ": " + oneIssue.msg.split("=>")[0] + "</span>",
							"tooltip": "Change the value of this entry to update your imported template",
							"onAction": function (id, value, form) {
								let fieldMsg;
								if (value !== oneIssue.entry.name) {
									fieldMsg = "<span class='green'>Fixed!</span>";
								}
								else {
									fieldMsg = "<span class='red'>Error " + oneIssue.code + ": " + oneIssue.msg.split("=>")[0] + "</span>";
								}
								
								form.entries.forEach((oneGroup) => {
									if (oneGroup.name === "endpoints") {
										oneGroup.entries.forEach((oneInput) => {
											if (oneInput.name === oneIssue.entry.type + "_name_" + count) {
												oneInput.fieldMsg = fieldMsg;
											}
											
											if (oneInput.name === oneIssue.entry.type + "_port_" + count) {
												oneInput.fieldMsg = fieldMsg;
											}
										});
									}
								});
							}
						});
						data [oneIssue.entry.type + "_port_" + count] = oneIssue.entry.port;
						break;
				}
			}
			
			for (let i = formEntries.length - 1; i >= 0; i--) {
				if (formEntries[i].entries.length === 0) {
					formEntries.splice(i, 1);
				}
			}
			
			let options = {
				timeout: $timeout,
				entries: formEntries,
				data: data,
				name: 'fixTemplateErrors',
				actions: [
					{
						type: 'submit',
						label: 'Submit Fixes',
						btn: 'primary',
						action: function (formData) {
							let inputs = {};
							for (let count = 0; count < issues.length; count++) {
								let oneIssue = issues[count];
								
								switch (oneIssue.entry.type) {
									case 'ci':
										if (oneIssue.entry.name.trim() === formData['ci_' + count].trim()) {
											$window.alert(`Change the name of CI Recipe ${oneIssue.entry.name} to proceed.`);
											return false;
										}
										if (!inputs.ci) {
											inputs.ci = [];
										}
										inputs.ci.push({
											old: oneIssue.entry.name,
											provider: oneIssue.entry.provider,
											new: formData['ci_' + count]
										});
										break;
									case 'catalogs':
										if (oneIssue.entry.name.trim() === formData['catalogs_' + count].trim()) {
											$window.alert(`Change the name of Catalog Recipe ${oneIssue.entry.name} to proceed.`);
											return false;
										}
										if (!inputs.catalogs) {
											inputs.catalogs = [];
										}
										inputs.catalogs.push({
											old: oneIssue.entry.name,
											new: formData['catalogs_' + count]
										});
										break;
									case 'endpoints':
										if (oneIssue.entry.name.trim() === formData['endpoints_name_' + count].trim() && oneIssue.entry.port === formData['endpoints_port_' + count]) {
											$window.alert(`Change the name of Endpoint ${oneIssue.entry.name} or its port value to proceed.`);
											return false;
										}
										
										if (!inputs.endpoints) {
											inputs.endpoints = [];
										}
										inputs.endpoints.push({
											old: oneIssue.entry.name,
											new: formData['endpoints_name_' + count],
											port: formData['endpoints_port_' + count]
										});
										break;
								}
							}
							
							overlayLoading.show();
							getSendDataFromServer(currentScope, ngDataApi, {
								'method': 'post',
								'routeName': '/dashboard/templates/import',
								"data": {
									"id": templateId,
									"correction": inputs
								}
							}, function (error, response) {
								overlayLoading.hide();
								if (error) {
									currentScope.displayAlert('danger', error.message);
								} else {
									if (response && Array.isArray(response) && response[0].code && response[0].msg) {
										//template contains errors that needs fixing
										fixTemplateProblems(currentScope, response, cb);
									}
									else {
										return cb();
									}
								}
							});
						}
					},
					{
						type: 'reset',
						label: 'Cancel',
						btn: 'danger',
						action: function () {
							if (currentScope.form && currentScope.form.formData) {
								currentScope.form.formData = {};
							}
							currentScope.listTemplates();
						}
					}
				]
			};
			buildForm(currentScope, null, options, () => {
			});
		}
	}
	
	function exportTemplate(currentScope) {
		
		let myBrowser = detectBrowser();
		currentScope.isSafari = myBrowser === 'safari';
		
		currentScope.collectedExportedConent = {};
		listUniqueProviders(currentScope, (ciRecipes) => {
			listRecipes(currentScope, (catalogs) => {
				listEndpoints(currentScope, (endpoints) => {
					
					currentScope.exportSections = [];
					if (ciRecipes) {
						currentScope.exportSections.push({
							section: 'ci',
							label: "Continuous Integration Recipes",
							data: ciRecipes
						});
					}
					
					if (catalogs) {
						currentScope.exportSections.push({
							section: 'catalogs',
							label: "Catalog Deployment Recipes",
							data: catalogs
						});
					}
					
					if (endpoints) {
						currentScope.exportSections.push({
							section: 'endpoints',
							label: "Endpoints",
							data: endpoints
						});
					}
					currentScope.exportSectionCounter = 0;
				});
			});
		});
	}
	
	function storeRecordsOf(currentScope) {
		currentScope.exportSections[currentScope.exportSectionCounter].data.forEach((oneRecord) => {
			let section = currentScope.exportSections[currentScope.exportSectionCounter].section;
			if (!currentScope.collectedExportedConent[section]) {
				currentScope.collectedExportedConent[section] = [];
			}
			
			if (oneRecord.selected) {
				//check unique
				if(currentScope.collectedExportedConent[section].indexOf(oneRecord.id) === -1){
					currentScope.collectedExportedConent[section].push(oneRecord.id);
				}
			}
			else{
				let index = currentScope.collectedExportedConent[section].indexOf(oneRecord.id);
				if(index >= 0 && index < currentScope.collectedExportedConent[section].length){
					currentScope.collectedExportedConent[section].splice(index, 1);
				}
			}
		});
		currentScope.nextStep();
	}
	
	function generateTemplate(currentScope) {
		for(let section in currentScope.collectedExportedConent){
			if(currentScope.collectedExportedConent[section].length === 0){
				delete currentScope.collectedExportedConent[section];
			}
		}
		
		if(Object.keys(currentScope.collectedExportedConent).length === 0){
			$window.alert("Selected at least on record from any section to generate the template.");
			return false;
		}
		
		overlayLoading.show();
		getSendDataFromServer(currentScope, ngDataApi, {
			'method': 'post',
			'routeName': '/dashboard/templates/export',
			'data': currentScope.collectedExportedConent,
			"headers": {
				"Accept": "application/zip"
			},
			"responseType": 'arraybuffer',
		}, function (error, response) {
			overlayLoading.hide();
			if (error) {
				currentScope.displayAlert('danger', error.message);
			} else {
				openSaveAsDialog("soajs_template_" + new Date().toISOString() + ".zip", response, "application/zip");
			}
		});
	}
	
	function listUniqueProviders(currentScope, cb) {
		overlayLoading.show();
		getSendDataFromServer(currentScope, ngDataApi, {
			'method': 'get',
			'routeName': '/dashboard/ci/providers'
		}, function (error, response) {
			overlayLoading.hide();
			if (error) {
				currentScope.displayAlert('danger', error.message);
			} else {
				let records;
				delete response.soajsauth;
				for (let provider in response) {
					if (!Array.isArray(records)) {
						records = [];
					}
					response[provider].forEach((oneRecipe) => {
						for(let i =0; i < 20; i++){
							records.push({
								'id': oneRecipe._id,
								'info': {"provider": provider, "name": oneRecipe.name}
							});
						}
					});
				}
				return cb(records);
			}
		});
	}
	
	function listRecipes(currentScope, cb) {
		overlayLoading.show();
		getSendDataFromServer(currentScope, ngDataApi, {
			method: 'get',
			routeName: '/dashboard/catalog/recipes/list'
		}, function (error, response) {
			overlayLoading.hide();
			if (error) {
				currentScope.displayAlert('danger', error.message);
			}
			else {
				let oldStyle = false;
				response.forEach(function (oneRecipe) {
					if (oneRecipe.type === 'soajs' || oneRecipe.recipe.deployOptions.specifyGitConfiguration || oneRecipe.recipe.deployOptions.voluming.volumes) {
						oldStyle = true;
					}
				});
				
				let records;
				if (!oldStyle) {
					if (response) {
						if (!Array.isArray(records)) {
							records = [];
						}
						
						response.forEach((oneCatalog) => {
							records.push({
								'id': oneCatalog._id,
								'info': {
									"name": oneCatalog.name,
									"type": oneCatalog.type,
									"category": oneCatalog.subtype
								}
							});
						});
					}
				}
				return cb(records);
			}
		});
	}
	
	function listEndpoints(currentScope, cb) {
		getSendDataFromServer(currentScope, ngDataApi, {
			"method": "get",
			"routeName": "/dashboard/apiBuilder/list",
			"params": {
				"mainType": "endpoints"
			}
		}, function (error, response) {
			if (error) {
				currentScope.displayAlert('danger', error.message, true, 'dashboard');
			}
			else {
				let records;
				if (response && response.records) {
					if (!Array.isArray(records)) {
						records = [];
					}
					
					response.records.forEach((oneEndpoint) => {
						records.push({
							'id': oneEndpoint._id,
							'info': {
								"group": oneEndpoint.serviceGroup,
								"name": oneEndpoint.serviceName,
								"port": oneEndpoint.servicePort
							}
						});
					});
				}
				return cb(records);
			}
		});
	}
	
	return {
		"listTemplates": listTemplates,
		"deleteTmpl": deleteTmpl,
		"upgradeTemplates": upgradeTemplates,
		"uploadTemplate": uploadTemplate,
		"exportTemplate": exportTemplate,
		"storeRecordsOf": storeRecordsOf,
		"generateTemplate": generateTemplate
	}
}]);