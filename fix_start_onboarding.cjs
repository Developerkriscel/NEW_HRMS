const fs = require('fs');
const file = 'components/pages/recruitment/onboarding/StartOnboardingModal.jsx';
let content = fs.readFileSync(file, 'utf8');

// The fuzzy matcher duplicated the file content after line 351.
// The file should end with the footer block.
// I'll search for the first instance of 'Save as Draft' which is in the footer,
// find its end, and truncate the rest of the file.

const marker = 'Save as Draft';
const firstIdx = content.indexOf(marker);

if (firstIdx !== -1) {
  // Let's just find the first </Portal> after this.
  // Wait, no. Let's just slice the file until the END of the first footer block.
  
  const endMarker = '          </div>\n        </div>\n\n      </div>\n      </div>\n    </Portal>\n  )\n}';
  const lastValidIndex = content.indexOf('Start Onboarding\n              </button>\n            )}\n          </div>\n        </div>\n\n      </div>\n    </Portal>\n  )');
  
  if (lastValidIndex !== -1) {
    // wait, I can just use a regex to replace everything from the first "Start Onboarding\n              </button>\n            )}\n          </div>\n        </div>" to the end of the file.
  }
}

// Actually, I can just find the string "Tasks Configured" which is right before the footer.
const tasksConfiguredIdx = content.indexOf('Tasks Configured');
if (tasksConfiguredIdx !== -1) {
    const startOfFooter = content.indexOf('{/* Footer */}', tasksConfiguredIdx);
    if (startOfFooter !== -1) {
        // Keep everything up to startOfFooter
        let newContent = content.substring(0, startOfFooter);
        newContent += `{/* Footer */}
        <div className="p-6 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between bg-white dark:bg-slate-900">
          <button
            onClick={handleBack}
            disabled={currentStep === 0}
            className={\`px-6 py-2.5 rounded-xl font-bold text-sm flex items-center gap-2 transition-all \${currentStep === 0 ? 'opacity-0 pointer-events-none' : 'text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800'}\`}
          >
            <ArrowLeft className="w-4 h-4" /> Back
          </button>
          
          <div className="flex gap-3">
            {currentStep > 0 && currentStep < STEPS.length - 1 && (
              <button onClick={onClose} className="px-6 py-2.5 rounded-xl font-bold text-sm text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800 transition-all">
                Save as Draft
              </button>
            )}
            
            {currentStep < STEPS.length - 1 ? (
              <button
                onClick={handleNext}
                disabled={currentStep === 0 && !formData.candidate}
                className="btn-primary min-w-[120px] justify-center"
              >
                Next <ArrowRight className="w-4 h-4" />
              </button>
            ) : (
              <button onClick={handleStart} className="btn-primary min-w-[160px] justify-center shadow-[0_8px_20px_rgba(37,99,235,0.3)] bg-gradient-to-r from-blue-600 to-indigo-600">
                Start Onboarding
              </button>
            )}
          </div>
        </div>

      </div>
      </div>
    </Portal>
  )
}
`;
        fs.writeFileSync(file, newContent);
        console.log('Fixed');
    }
}
