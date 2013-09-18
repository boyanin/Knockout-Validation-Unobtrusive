/*
===============================================================================
    Author:     Boyan Mihaylov / @bmihaylov
    License:    MIT (http://opensource.org/licenses/mit-license.php)           
                                                                               
    Description: Unobtrusive Validation extension to KnockoutJS Validation
===============================================================================
*/

(function (window, ko) {

    if (typeof ko !== "object" || ko == null)
        throw new Error("ko.validation.unobtrusive: ko is not present");
    if (typeof ko.validation !== "object" || ko.validation == null)
        throw new Error("ko.validation.unobtrusive: ko.validation is not present");

    ko.validation.unobtrusive = {};

    //#region Utils

    ko.validation.unobtrusive.utils = {
        isNotNullObject: function (obj) {
            return (typeof obj === "object" && obj != null);
        },

        //
        // Given a view model and a property path (i.e. my.cool.prop.name)
        // this function returns the object containing the property 'prop'
        // and the last property in the path, i.e. 'name'. This way the
        // property can be replaced with an extender
        getPropertyContext: function (viewModel, propertyPath) {
            var values = propertyPath.split('.');
            var currentObj = viewModel;
            for (var i = 0; i < values.length - 1; i++) {
                if (typeof currentObj !== "object")
                    return false;

                currentObj = currentObj[values[i]];
            }
            return {
                propertyName: values[values.length - 1],
                parentObj: currentObj
            };
        }
    };
    var utils = ko.validation.unobtrusive.utils;

    //#endregion

    //#region Rule provider

    ko.validation.unobtrusive.DefaultRuleProvider = function () {
        return {
            adapters: {
                required: function (validationExtObj, validationAttributes) {
                    if (validationAttributes['required']) {
                        validationExtObj.required = {
                            params: true,
                            message: validationAttributes['required']
                        };
                    }
                },
                number: function (validationExtObj, validationAttributes) {
                    if (validationAttributes['number']) {
                        validationExtObj.number = {
                            params: true,
                            message: validationAttributes['number']
                        };
                    }
                },
                range: function (validationExtObj, validationAttributes) {
                    if (validationAttributes['range'] && validationAttributes['range-max'] && validationAttributes['range-min']) {
                        validationExtObj.min = {
                            params: parseInt(validationAttributes['range-min']),
                            message: validationAttributes['range']
                        };
                        validationExtObj.max = {
                            params: parseInt(validationAttributes['range-max']),
                            message: validationAttributes['range']
                        };
                    }
                },
                regex: function (validationExtObj, validationAttributes) {
                    if (validationAttributes['regex'] && validationAttributes['regex-pattern']) {
                        validationExtObj.pattern = {
                            params: validationAttributes['regex-pattern'],
                            message: validationAttributes['regex']
                        };
                    }
                },
                date: function (validationExtObj, validationAttributes) {
                    if (validationAttributes['date']) {
                        validationExtObj.date = {
                            params: true,
                            message: validationAttributes['date']
                        };
                    }
                },
                equalTo: function (validationExtObj, validationAttributes, viewModel) {
                    if (validationAttributes['equalto'] && validationAttributes['equalto-other']) {
                        var other = validationAttributes['equalto-other'].replace('*.', '');
                        var propCtx = utils.getPropertyContext(viewModel, other[0].toLowerCase() + other.substring(1));
                        if (utils.isNotNullObject(propCtx)) {
                            validationExtObj.equal = {
                                params: propCtx.parentObj[propCtx.propertyName],
                                message: validationAttributes['equalto']
                            };
                        }
                    }
                },
                length: function (validationExtObj, validationAttributes) {
                    if (validationAttributes['length']) {
                        if (validationAttributes['length-min']) {
                            validationExtObj.minLength = {
                                params: parseInt(validationAttributes['length-min']),
                                message: validationAttributes['length']
                            };
                        }
                        if (validationAttributes['length-max']) {
                            validationExtObj.maxLength = {
                                params: parseInt(validationAttributes['length-max']),
                                message: validationAttributes['length']
                            };
                        }
                    }
                },
            },
            //
            // Gets the string containing the binding instructions from a
            // HTML element
            getBindingString: function (element) {
                return element.getAttribute('data-bind');
            },

            //
            // Returns an object which is used by Knockout validation to set up
            // the validation rules. For more information about available
            // rules, visit <ko.validation>
            getRules: function (viewModel, element) {
                var validationAttributes = this.getValidationAttributes(element);
                var validationExtObj = {};

                for (var adapter in this.adapters) {
                    this.adapters[adapter](validationExtObj, validationAttributes, viewModel);
                }

                return validationExtObj;
            },

            //
            // This function is not part of the interface. It gets all attributes
            // of an element that start with 'data-val-'
            getValidationAttributes: function (element) {
                var attributes = {};
                for (var i = 0; i < element.attributes.length; i++) {
                    var attr = element.attributes[i];
                    if (ko.utils.stringStartsWith(attr.name, "data-val-"))
                        attributes[attr.name.substring(9)] = attr.value; // remove data-val- prefix
                }
                return attributes;
            }
        };
    };

    //#endregion

    //#region Public API

    (function (unobtrusive) {

        var ruleProvider = new unobtrusive.DefaultRuleProvider();
        unobtrusive.getRuleProvider = function () {
            return ruleProvider;
        };
        unobtrusive.setRuleProvider = function (provider) {
            ruleProvider = provider;
        };


        var allowedBinding = ['value', 'checked'];
        unobtrusive.getAllowedBindings = function () {
            return allowedBinding;
        };
        unobtrusive.addAllowedBinding = function (bindingName) {
            if (ko.utils.arrayIndexOf(allowedBinding, bindingName) < 0) {
                allowedBinding.push(bindingName);
            }
        };
        unobtrusive.removeAllowedBinding = function (bindingName) {
            allowedBinding.remove(bindingName); // TODO: check if this is true remove?
        };


        function parseElement(viewModel, element) {
            var ruleProvider = ko.validation.unobtrusive.getRuleProvider();
            var validationExtObj = ruleProvider.getRules(viewModel, element);
            var bindings = ko.expressionRewriting.parseObjectLiteral(ruleProvider.getBindingString(element));
            var allowedBindings = ko.validation.unobtrusive.getAllowedBindings();
            for (var i = 0; i < allowedBindings.length; i++) {
                var binding = ko.utils.arrayFirst(bindings, function (b) { return ko.utils.stringTrim(b.key) === allowedBindings[i]; });
                if (binding) {
                    var propCtx = utils.getPropertyContext(viewModel, ko.utils.stringTrim(binding.value));
                    if (utils.isNotNullObject(propCtx)) {
                        propCtx.parentObj[propCtx.propertyName] = propCtx.parentObj[propCtx.propertyName].extend(validationExtObj);
                        break;
                    }
                }
            }
        }
        unobtrusive.init = function (viewModel, rootNode) {
            $('[data-val="true"]', $(rootNode)).each(function (index, element) {
                parseElement(viewModel, element);
            });
        };

    })(ko.validation.unobtrusive);

    //#endregion

    //
    // Add a custom extender for validation
    ko.bindingHandlers.validatesubmit = {
        init: function (element, valueAccessor) {
            var obs = ko.validatedObservable(ko.utils.unwrapObservable(valueAccessor()));
            $(element).click(function (e) {
                if (!obs.isValid()) {
                    obs.errors.showAllMessages();
                    e.stopImmediatePropagation();
                }
            });
        }
    };

    // Replace applyBindings so we injct our functionality
    var origApplyBindings = ko.applyBindings;
    ko.applyBindings = function (viewModel, rootNode) {
        if (rootNode && (rootNode.nodeType !== 1) && (rootNode.nodeType !== 8))
            throw new Error("ko.applyBindings: first parameter should be your view model; second parameter should be a DOM node");
        rootNode = rootNode || window.document.body;

        ko.validation.unobtrusive.init(viewModel, rootNode);

        origApplyBindings(viewModel, rootNode);
    };

})(window, ko);