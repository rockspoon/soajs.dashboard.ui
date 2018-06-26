"use strict";
var vmsServices = soajsApp.components;
vmsServices.service('platformsVM', ['ngDataApi', '$timeout', '$modal', '$cookies', '$window', function (ngDataApi, $timeout, $modal, $cookies, $window) {

	function listInfraProviders(currentScope, cb) {
		//get the available providers
		getSendDataFromServer(currentScope, ngDataApi, {
			"method": "get",
			"routeName": "/dashboard/infra"
		}, function (error, providers) {
			if (error) {
				currentScope.displayAlert('danger', error.message);
			}
			else {
				delete providers.soajsauth;
				currentScope.infraProviders = providers;
			}
		});
		return cb();
	}

	function listVMLayers(currentScope, cb) {

		if(!currentScope.infraProviders){
			listInfraProviders(currentScope, () => {
				nextStep();
			});
		}
		else{
			nextStep();
		}

		function nextStep(){
			//call common function
			getInfraProvidersAndVMLayers(currentScope, ngDataApi, currentScope.envCode, currentScope.infraProviders, (vmLayers) => {
				currentScope.vmLayers = vmLayers;
				if(cb && typeof cb === 'function'){
					return cb();
				}
			});
		}
	}

	function inspectVMLayer(currentScope, oneVMLayer){
		let formConfig = angular.copy(environmentsConfig.form.serviceInfo);
		formConfig.entries[0].value = angular.copy(oneVMLayer);
		delete formConfig.entries[0].value.infraProvider.regions;
		delete formConfig.entries[0].value.infraProvider.templates;
		delete formConfig.entries[0].value.infraProvider.groups;

		let options = {
			timeout: $timeout,
			form: formConfig,
			name: 'serviceInfo',
			label: oneVMLayer.name + ' | Layer Inspection',
			actions: [
				{
					'type': 'reset',
					'label': translation.ok[LANG],
					'btn': 'primary',
					'action': function (formData) {
						currentScope.modalInstance.dismiss('cancel');
						currentScope.form.formData = {};
					}
				}
			]
		};
		buildFormWithModal(currentScope, $modal, options);
	}

	function deleteVMLayer(currentScope, oneVMLayer){
		getSendDataFromServer(currentScope, ngDataApi, {
			"method": "delete",
			"routeName": "/dashboard/cloud/vm",
			"params": {
				"env": currentScope.envCode,
				"layerName": oneVMLayer.name,
				"infraId": oneVMLayer.infraProvider._id,
				'technology': 'vm'
			}
		}, function (error, response) {
			if (error) {
				currentScope.displayAlert('danger', error.code, true, 'dashboard', error.message);
			}
			else {
				listVMLayers(currentScope);
			}
		});
	}

	function addVMLayer (currentScope){

		function defaultSaveActionMethod(modalScope, oneProvider, formData, modalInstance) {
			if(currentScope.saveActionMethodAdd){
				currentScope.saveActionMethodAdd(modalScope, oneProvider, formData, modalInstance);
			}
			else{
				//collect the inputs from formData, formulate API call and trigger it
				//formData should include
				/*
					1- template chosen
					2- region to use
					3- template inputs
				 */
				getSendDataFromServer(currentScope, ngDataApi, {
					"method": "post",
					"routeName": "/dashboard/cloud/vm",
					"params": {
						"env": currentScope.envCode,
						'technology': 'vm',
						"infraId": oneProvider._id
					},
					"data": {
						"infraCodeTemplate" : formData.infraCodeTemplate,
						"region" : formData.region,
						"name" : formData.name,
						"specs": formData
					}
				}, function (error, response) {
					if (error) {
						modalScope.form.displayAlert('danger', error.code, true, 'dashboard', error.message);
					}
					else {
						currentScope.displayAlert('success', "Virtual Machine Layer created, the process will take few minutes before it shows up in the list.");
						if(modalInstance){
							modalInstance.close();
						}
						$timeout(() => {
							listVMLayers(currentScope);
						}, 1000);
					}
				});
			}
		}

		let saveActionMethod = defaultSaveActionMethod;

		let vmProviders = angular.copy(currentScope.infraProviders);
		for (let i = vmProviders.length -1; i >=0; i--){
			let oneProvider = vmProviders[i];
			if(oneProvider.technologies.indexOf("vm") === -1){
				vmProviders.splice(i, 1);
			}
		}

		let formEntries = [{
			type: 'select',
			label: "Select Infra Provider",
			name: "infraProvider",
			value: [],
			required: true,
			fieldMsg: "Select the Infra Provider you want to create the VM Layer at.",
			onAction: (id, value, form) => {
				let region = {
					'name': 'region',
					'label': 'Select a Region',
					'type': 'select',
					'value': value.regions,
					'tooltip': 'Select Deployment Region',
					'required': true,
					"fieldMsg": "Deployments are based on regions; Regions differ in type & price of machines as well as data transfer charges."
				};

				if(region.value && region.value.length > 0){
					region.value[0].selected = true;
				}
				form.entries.push(region);

				let groups = {
					'name': 'group',
					'label': 'Select a Group',
					'type': 'select',
					'value': [],
					'tooltip': 'Select Resource Group',
					'required': true
				};

				value.groups.forEach((oneGroup) =>{
					groups.value.push({v: oneGroup.name, l: oneGroup.name})
				});

				if(groups.value && groups.value.length > 0){
					groups.value[0].selected = true;
				}
				form.entries.push(groups);
			}
		}];

		vmProviders.forEach((oneProvider) => {
			formEntries[0].value.push({
				v: oneProvider,
				l: oneProvider.label
			});
		});

		let options = {
			timeout: $timeout,
			form: {
				"entries": formEntries
			},
			name: 'selectProvider',
			label: 'Select Infra Cloud Provider',
			actions: [
				{
					'type': 'submit',
					'label': translation.submit[LANG],
					'btn': 'primary',
					'action': function (formData) {
						currentScope.modalInstance.close();
						let data = {
							inputs: {
								region: formData.region, group: formData.group
							}
						};
						populateVMLayerForm(currentScope, formData.infraProvider, formData.infraProvider.drivers[0].toLowerCase(), data, saveActionMethod);
					}
				},
				{
					'type': 'reset',
					'label': translation.cancel[LANG],
					'btn': 'danger',
					'action': function () {
						currentScope.modalInstance.dismiss('cancel');
						currentScope.form.formData = {};
					}
				}
			]
		};
		buildFormWithModal(currentScope, $modal, options);
	}

	function editVMLayer(currentScope, oneVMLayer){
		// oneVMLayerTemplateRecord --> retrieved from db

		function defaultSaveActionMethod(modalScope, oneProvider, formData, modalInstance) {
			if(currentScope.saveActionMethodModify){
				currentScope.saveActionMethodModify(modalScope, oneVMLayer, oneProvider, formData, modalInstance);
			}
			else{
				//collect the inputs from formData, formulate API call and trigger it
				//formData should include
				/*
					1- template chosen
					2- region to use
					3- template inputs
				 */
				getSendDataFromServer(currentScope, ngDataApi, {
					"method": "put",
					"routeName": "/dashboard/cloud/vm",
					"params": {
						"env": currentScope.envCode,
						'technology': 'vm',
						"infraId": oneProvider._id,
						"layerName": oneVMLayer._id
					},
					"data": {
						"infraCodeTemplate" : formData.infraCodeTemplate,
						"region" : formData.region,
						"name" : formData.name,
						"specs": formData
					}
				}, function (error, response) {
					if (error) {
						modalScope.form.displayAlert('danger', error.code, true, 'dashboard', error.message);
					}
					else {
						currentScope.displayAlert('success', "Virtual Machine Layer updated, the process will take few minutes before it shows up in the list.");
						if(modalInstance){
							modalInstance.close();
						}
						$timeout(() => {
							listVMLayers(currentScope);
						}, 1000);
					}
				});
			}
		}

		//if add environment made the call, this vm actually exists only in wizard scope
		if(currentScope.saveActionMethodModify){
			let oneVMLayerTemplateRecord = oneVMLayer.formData;
			let saveActionMethod = defaultSaveActionMethod;
			populateVMLayerForm(currentScope, oneVMLayer.infraProvider, oneVMLayer.infraProvider.drivers[0].toLowerCase(), oneVMLayerTemplateRecord, saveActionMethod);
		}
		else{
			/**
			 * call api and get how this vm layer was created
			 */
			getSendDataFromServer(currentScope, ngDataApi, {
				"method": "get",
				"routeName": "/dashboard/cloud/vm/layer/status",
				"params": {
					"env": currentScope.envCode,
					'technology': 'vm',
					"infraId": oneVMLayer.infraProvider._id,
					"layerName": oneVMLayer.name
				}
			}, function (error, response) {
				if (error) {
					currentScope.displayAlert('danger', error.code, true, 'dashboard', error.message);
				}
				else {
					let oneVMLayerTemplateRecord = response;
					let saveActionMethod = defaultSaveActionMethod;
					populateVMLayerForm(currentScope, oneVMLayer.infraProvider, oneVMLayer.infraProvider.drivers[0].toLowerCase(), oneVMLayerTemplateRecord, saveActionMethod);
				}
			});
		}
	}

	function populateVMLayerForm(currentScope, oneProvider, technology, data, submitActionMethod) {

		//call the api that ameer will do
		function getInfraExtras(cb){
			getSendDataFromServer(currentScope, ngDataApi, {
				"method": "get",
				"routeName": "/dashboard/infra/extras",
				"params": {
					"envCode": currentScope.envCode,
					"id": oneProvider._id,
					"region": data.inputs.region,
					"group": data.inputs.group,
					"extras": [ 'osDisks', 'dataDisks', 'loadBalancers', 'networks', 'publicIps', 'securityGroups', 'vmSizes' ]
				}
			}, function (error, response) {
				if (error) {
					currentScope.displayAlert('danger', error.code, true, 'dashboard', error.message);
				}
				else {
					return cb(response);
				}
			});
		}

		function renderForm(computedValues){
			let selectedInfraProvider = angular.copy(oneProvider);
			let formEntries = angular.copy(environmentsConfig.providers[oneProvider.name][technology].ui.form.deploy.entries);

			if(formEntries && formEntries.length > 0){
				let infraTemplates =[];
				oneProvider.templates.forEach((oneTmpl) => {
					let label = oneTmpl.name;
					if(oneTmpl.description && oneTmpl.description !== ''){
						label += " | " + oneTmpl.description;
					}
					infraTemplates.push({'v': oneTmpl.name, 'l': label});
				});

				formEntries.push({
					type: 'select',
					name: 'infraCodeTemplate',
					label: "Infra Code Template",
					value: infraTemplates,
					required: true,
					fieldMsg: "Pick which Infra Code template to use for the deployment of your cluster.",
					onAction: function(id, value, form){
						form.entries.length = 2;
						updateFormEntries(computedValues, value, form);
					}
				});

				$modal.open({
					templateUrl: "infraProvider.tmpl",
					size: 'lg',
					backdrop: true,
					keyboard: true,
					controller: function ($scope, $modalInstance) {
						fixBackDrop();
						$scope.title = 'Configuring Deployment on ' + selectedInfraProvider.label;

						let formConfig = {
							timeout: $timeout,
							data: data.inputs,
							"entries": formEntries,
							name: 'vmdeployon' + selectedInfraProvider.name,
							"actions": [
								{
									'type': 'submit',
									'label': "Save & Continue",
									'btn': 'primary',
									'action': function (formData) {

										// add region and group to formData
										formData = Object.assign(formData, data.inputs);
										let myPattern = /^([a-zA-Z0-9_\-\.]){2,80}$/;
										if(!myPattern.test(formData.name)){
											$window.alert("Make sure that the VMLayer name is between 2 and 80 characters where alphanumeric, hyphen, underscore, and period are the only allowed characters.");
										}
										else{
											remapFormDataBeforeSubmission($scope, formData, () => {
												submitActionMethod($scope, oneProvider, formData, $modalInstance);
											});
										}
									}
								},
								{
									'type': 'reset',
									'label': translation.cancel[LANG],
									'btn': 'danger',
									'action': function () {
										$modalInstance.dismiss('cancel');
									}
								}
							]
						};

						buildForm($scope, null, formConfig, () => {
							if(data && data.infraCodeTemplate){
								$scope.form.formData = data;
								updateFormEntries(computedValues, data.infraCodeTemplate, $scope.form);
							}
						});
					}
				});
			}
		}

		function remapFormDataBeforeSubmission(modalScope, formData, cb) {

			function mapEntryToFormData(oneEntry){
				if(oneEntry.entries && oneEntry.multi && Object.hasOwnProperty.call(oneEntry, 'limit')){
					let tempData = [];
					oneEntry.entries.forEach((oneSubEntry) =>{
						let tempObj = {};
						if(oneSubEntry.entries){
							oneSubEntry.entries.forEach((level2Entries) => {
								if(!level2Entries.name.includes("add_another") && !level2Entries.name.includes("remove_another")) {
									tempObj[level2Entries.name.replace(/_c_[0-9]+/, '')] = formData[level2Entries.name];
									delete formData[level2Entries.name];
								}

								mapEntryToFormData(level2Entries)
							});
						}
						else{
							if(!oneSubEntry.name.includes("add_another") && !oneSubEntry.name.includes("remove_another")){
								tempObj[oneSubEntry.name] = formData[oneSubEntry.name];
							}
						}
						if(Object.keys(tempObj).length > 0){
							tempData.push(tempObj);
						}
					});

					formData[oneEntry.name] = tempData;
				}
			}

			function recursiveMapping(oneEntry){

				mapEntryToFormData(oneEntry);
				if(oneEntry.entries){
					oneEntry.entries.forEach((oneEntry) => {
						recursiveMapping(oneEntry);
					});
				}
			}

			modalScope.form.entries.forEach((oneEntry) => {
				recursiveMapping(oneEntry);
			});

			return cb();
		}

		function updateFormEntries(computedValues, value, form){
			overlayLoading.show();
			oneProvider.templates.forEach((oneTmpl) => {
				if(oneTmpl.name === value && oneTmpl.inputs && Array.isArray(oneTmpl.inputs)){
					form.entries = form.entries.concat(oneTmpl.inputs);

					//map computed inputs
					mapComputedInputs(form.entries, computedValues);

					form.refresh(false);
					$timeout(() => {
						form.buildDisabledRulesIndexer();
						overlayLoading.hide();
					}, 1000)
				}
			});
		}

		function mapComputedInputs(entries, computedValues){

			function mapOneEntry(oneEntry){
				if(oneEntry.type === 'select' && oneEntry.value && oneEntry.value.key && oneEntry.value.fields){
					if(computedValues[oneEntry.value.key] && Array.isArray(computedValues[oneEntry.value.key])){
						let values = [];
						computedValues[oneEntry.value.key].forEach((oneComputedValue) => {
							values.push({
								v: oneComputedValue[oneEntry.value.fields.v],
								l: oneComputedValue[oneEntry.value.fields.l]
							})
						});
						oneEntry.value = values;
					}
				}
				else if(oneEntry.type === 'uiselect' && oneEntry.computedValue && oneEntry.computedValue.key && oneEntry.computedValue.fields){
					if(computedValues[oneEntry.computedValue.key] && Array.isArray(computedValues[oneEntry.computedValue.key])){
						let values = [];
						computedValues[oneEntry.computedValue.key].forEach((oneComputedValue) => {
							values.push({
								v: oneComputedValue[oneEntry.computedValue.fields.v],
								l: oneComputedValue[oneEntry.computedValue.fields.l]
							})
						});
						oneEntry.value = values;
					}
				}
			}

			function scanEntries(entries){
				entries.forEach((oneEntry) => {
					if(oneEntry.entries){
						if(oneEntry.multi){
							if(oneEntry.limit && oneEntry.limit !== 0){
								//fixed multi limit
								replicateInput(oneEntry, oneEntry.limit);
							}
							else{
								//add another la yenfezir
								replicateInput(oneEntry, null);
							}
						}
						else {
							scanEntries(oneEntry.entries);
						}
					}
					else{
						mapOneEntry(oneEntry)
					}
				});
			}

			function replicateInput(original, limit) {

				if (!original.counter) {
					original.counter = 0;
				}

				//no limit, add another
				if(!limit){
					let arraycount = 1; // ma btozbat bel edit heyde
					original.template = angular.copy(original.entries);

					let finalEntries = [];
					for(let i =0; i < arraycount; i++){
						pushOneDynamicEntry(finalEntries, i, original.template);
						original.counter++;
					}
					original.entries = finalEntries;

					//hook add another
					original.entries.push({
						"type": "html",
						"name": "add_another" + original.name,
						"value": "<a class='btn btn-sm btn-primary f-right'><span class='icon icon-plus'></span> Add Another</a>",
						"onAction": function(id, value, form){
							let another = angular.copy(original.template);
							//hook the remove entry input
							let removeButon = {
								"type": "html",
								"name": "remove_another" + original.name,
								"value": "<a class='btn btn-sm btn-danger f-right'><span class='icon icon-cross'></span> Remove</a>",
								"onAction": function(id, value, form){
									let currentCounter = parseInt(id.split("_c_")[1]);
									for(let i = original.entries.length -1; i >= 0; i--){
										if(original.entries[i].name.includes("_c_" + currentCounter)){
											original.entries.splice(i, 1);
											for(let inputName in form.formData){
												if(inputName.includes("_c_" + currentCounter)){
													delete form.formData[inputName];
												}
											}
										}
									}
								}
							};

							if(another[0].entries){
								another[0].entries.unshift(removeButon);
							}
							else{
								another.unshift(removeButon);
							}

							let finalEntries = [];
							pushOneDynamicEntry(finalEntries, original.counter, another);

							original.counter++;
							let anotherButton = original.entries[original.entries.length -1];
							original.entries.splice(original.entries.length -1, 1);
							original.entries = original.entries.concat(finalEntries);
							original.entries.push(anotherButton);

							scanEntries(original.entries);
						}
					});
				}
				//yes limit only populate based on count
				else {
					original.template = angular.copy(original.entries);
					let finalEntries = [];
					for (let i = 0; i < limit; i++) {
						pushOneDynamicEntry(finalEntries, i, original.template);
						original.counter ++;
					}
					original.entries = finalEntries;
				}
				scanEntries(original.entries);
			}

			function pushOneDynamicEntry(finalEntries, counter, templateEntries) {
				let inputs = angular.copy(templateEntries);
				inputs.forEach((oneInput) => {
					oneInput.name += "_c_" + counter;

					if (oneInput.entries) {
						allMyEntries(oneInput.entries, counter);
					}
					counter++;
					finalEntries.push(oneInput);
				});
			}

			function allMyEntries(entries, countValue, parentName) {
				entries.forEach(function (oneEntry) {
					if (oneEntry.entries) {
						allMyEntries(oneEntry.entries, countValue, oneEntry.name);
					}

					// if edit
					// if(resource && resource.config && resource.config[parentName] && Array.isArray(resource.config[parentName])){
					// 	if(resource.config[parentName][countValue]){
					// 		if(oneEntry.type === 'text'){
					// 			oneEntry.value = resource.config[parentName][countValue][oneEntry.name];
					// 			oneEntry.value = oneEntry.value.toString();
					//
					// 			if(currentScope.form && currentScope.form.formData){
					// 				currentScope.form.formData[oneEntry.name + countValue] = oneEntry.value;
					// 			}
					// 		}
					// 	}
					// }

					if (oneEntry.name) {
						oneEntry.name += "_c_" + countValue;
					}
				});
			}
			scanEntries(entries);
		}

		overlayLoading.show();
		getInfraExtras((computedValues) => {
			overlayLoading.hide();
			renderForm(computedValues);
		});
	}

	return {
		'listInfraProviders': listInfraProviders,
		'listVMLayers': listVMLayers,
		'inspectVMLayer': inspectVMLayer,
		'addVMLayer': addVMLayer,
		'editVMLayer': editVMLayer,
		'populateVMLayerForm': populateVMLayerForm,
		'deleteVMLayer': deleteVMLayer
	}
}]);
