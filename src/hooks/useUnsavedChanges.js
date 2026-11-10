import { useEffect } from "react";                                             
                                                                               
const CONFIRM_MESSAGE =                                                        
  "You have unsaved changes. Are you sure you want to leave?";                 
                                                                               
export function useUnsavedChanges(isDirty) {                                   
  useEffect(() => {                                                            
    if (!isDirty) return;                                                      
                                                                               
    // 1) Tab close / refresh -> native browser dialog                         
    const onBeforeUnload = (e) => {                                            
      e.preventDefault();                                                      
      e.returnValue = ""; // required for Chrome                               
    };                                                                         
    window.addEventListener("beforeunload", onBeforeUnload);                   
                                                                               
    // 2) In-app navigation via <Link>/<NavLink> clicks.                       
    //    Runs in the capture phase, before React Router's Link handler,       
    //    so cancelling here stops the navigation completely.                  
    const onDocumentClick = (e) => {                                           
      if (e.defaultPrevented) return;                                          
      if (e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey)  
        return;                                                                
                                                                               
      const anchor = e.target instanceof Element ? e.target.closest("a") :     
null;                                                                          
      if (!anchor) return;                                                     
                                                                               
      const href = anchor.getAttribute("href");                                
      if (!href) return;                                                       
                                                                               
      let target;                                                              
      try {                                                                    
        target = new URL(href, window.location.href);                          
      } catch {                                                                
        return;                                                                
      }                                                                        
                                                                               
      // External links / new tabs / downloads do a full page load,            
      // which is already covered by beforeunload                              
      if (target.origin !== window.location.origin) return;                    
      if (anchor.target === "_blank" || anchor.hasAttribute("download"))       
return;                                                                        
                                                                               
      // Same page (only hash/query changes) -> no prompt needed               
      if (target.pathname === window.location.pathname) return;                
                                                                               
      if (!window.confirm(CONFIRM_MESSAGE)) {                                  
        e.preventDefault();                                                    
        e.stopPropagation();                                                   
      }                                                                        
    };                                                                         
                                                                               
    document.addEventListener("click", onDocumentClick, true);                 
                                                                               
    return () => {                                                             
      window.removeEventListener("beforeunload", onBeforeUnload);              
      document.removeEventListener("click", onDocumentClick, true);            
    };                                                                         
  }, [isDirty]);                                                               
}   