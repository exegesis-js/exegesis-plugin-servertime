import * as exegesis from 'exegesis';
import { ExegesisContext, ExegesisPluginContext } from 'exegesis';
import http from 'http';
import * as servertime from 'servertime';
import { Readable } from 'stream';

function isReadable(obj: any): obj is Readable {
    return obj && obj.pipe && typeof obj.pipe === 'function';
}

/**
 * If the object in the respons is a plain object, convert it to JSON so we
 * can time how long that takes.
 */
function jsonEncodeBody(context: ExegesisContext) {
    const headers = context.res.headers;
    const body = context.res.body;

    if (body) {
        if (body instanceof Buffer) {
            // Ignore
        } else if (typeof body === 'string') {
            // Ignore
        } else if (isReadable(body)) {
            // Ignore
        } else {
            if (!headers['content-type']) {
                headers['content-type'] = 'application/json';
            }
            context.origRes.serverTiming.start('json');
            context.res.body = JSON.stringify(body);
            context.origRes.serverTiming.end('json');
        }
    }
}


function makeExegesisPlugin(options: servertime.ServertimeOptions, { apiDoc }: any) {
    // Verify the apiDoc is an OpenAPI 3.x.x document, because this plugin
    // doesn't know how to handle anything else.
    if (!apiDoc.openapi) {
        throw new Error("OpenAPI definition is missing 'openapi' field");
    }
    // if(!semver.satisfies(apiDoc.openapi, '>=3.0.0 <4.0.0')) {
    //     throw new Error(`OpenAPI version ${apiDoc.openapi} not supported`);
    // }

    // Can make modifications to apiDoc at this point, such as adding new
    // routes, or modifying documentation - whatever you want to do.  Just
    // keep in mind that other plugins might make changes, also, either before
    // or after this.  If you need the "final" apiDoc, see `preCompile`.

    // Return an ExegesisPluginInstance.
    const instance: exegesis.ExegesisPluginInstance = {
        // Called before routing.  Note that the context hasn't been created yet,
        // so you just get a raw `req` and `res` object here.
        preRouting({ res }: { req: http.IncomingMessage; res: http.ServerResponse }) {
            servertime.addToResponse(res, options);
            res.serverTiming.start('route');
        },

        // Called immediately after the routing phase.  Note that this is
        // called before Exegesis verifies routing was valid - the
        // `pluginContext.api` object will have information about the
        // matched route, but will this information may be incomplete.
        // For example, for OAS3 we may have matched a route, but not
        // matched an operation within the route. Or we may have matched
        // an operation but that operation may have no controller defined.
        // (If we failed to match a route at all, this will not be called.)
        //
        // If your API added a route to the API document, this function is a
        // good place to write a reply.
        //
        // Note that calling `pluginContext.getParams()` or `pluginContext.getRequestBody()`
        // will throw here if routing was not successful.
        postRouting(pluginContext: ExegesisPluginContext) {
            pluginContext.origRes.serverTiming.end('route');
            pluginContext.origRes.serverTiming.start('security');
        },

        // Called for each request, after security phase and before input
        // is parsed and the controller is run.  This is a good place to
        // do extra security checks.  The `exegesis-plugin-roles` plugin,
        // for example, generates a 403 response here if the authenticated
        // user has insufficient privliedges to access this path.
        //
        // Note that this function will not be called if a previous pluing
        // has already written a response.
        postSecurity(pluginContext: ExegesisPluginContext) {
            pluginContext.origRes.serverTiming.end('security');
            pluginContext.origRes.serverTiming.start('controller');
        },

        // Called immediately after the controller has been run, but before
        // any response validation.  This is a good place to do custom
        // response validation.  If you have to deal with something weird
        // like XML, this is where you'd handle it.
        //
        // This function can modify the contents of the response.
        postController(context: ExegesisContext) {
            context.origRes.serverTiming.end('controller');
            context.origRes.serverTiming.start('responseValidation');
        },

        // Called after the response validation step.  This is the last step before
        // the response is converted to JSON and written to the output.
        postResponseValidation(context: ExegesisContext) {
            context.origRes.serverTiming.end('responseValidation');
            jsonEncodeBody(context);
        },
    };

    return instance;
}

export default function plugin(options: servertime.ServertimeOptions) {
    return {
        info: {
            // This should match the name of your npm package.
            name: 'exegesis-servertime',
        },
        makeExegesisPlugin: makeExegesisPlugin.bind(undefined, options),
    };
}
