import os
import io
import traceback
import base64
import requests
from flask import Flask, request, jsonify, send_file
from flask_cors import CORS
from PIL import Image
from dotenv import load_dotenv
import replicate

# Load environment variables
load_dotenv()

# Initialize Flask app
app = Flask(__name__)

# Get the URL, default to None
NODE_API = os.getenv('NODE_API_URL')

# Create a list of allowed origins
origins = ["http://localhost:5000"]
if NODE_API:
    origins.append(NODE_API)

# Configure CORS
CORS(app, resources={r"/api/*": {"origins": origins}})
# Get API token
REPLICATE_API_TOKEN = os.getenv('REPLICATE_API_TOKEN')

# Set the token as environment variable (required by replicate library)
if REPLICATE_API_TOKEN:
    os.environ['REPLICATE_API_TOKEN'] = REPLICATE_API_TOKEN

def optimize_image_for_api(image_bytes, max_size=1024):
    """
    Optimize image for API upload by resizing and compressing.
    This prevents timeout issues with large base64 strings.
    """
    try:
        # Open the image
        image = Image.open(io.BytesIO(image_bytes))
        
        # Convert to RGB if necessary
        if image.mode in ('RGBA', 'LA', 'P'):
            image = image.convert('RGB')
        
        # Calculate new size while maintaining aspect ratio
        width, height = image.size
        if max(width, height) > max_size:
            if width > height:
                new_width = max_size
                new_height = int(height * (max_size / width))
            else:
                new_height = max_size
                new_width = int(width * (max_size / height))
            
            image = image.resize((new_width, new_height), Image.Resampling.LANCZOS)
            print(f"Resized image from {width}x{height} to {new_width}x{new_height}")
        
        # Save optimized image to buffer
        buffer = io.BytesIO()
        image.save(buffer, format='JPEG', quality=85, optimize=True)
        buffer.seek(0)
        
        return buffer.getvalue()
    except Exception as e:
        print(f"Error optimizing image: {e}")
        raise

def image_to_data_url(image_bytes):
    """Convert image bytes to a data URL for Replicate API."""
    try:
        # First optimize the image
        optimized_bytes = optimize_image_for_api(image_bytes)
        
        # Convert to base64
        base64_image = base64.b64encode(optimized_bytes).decode('utf-8')
        
        # Create data URL
        data_url = f"data:image/jpeg;base64,{base64_image}"
        
        print(f"Generated data URL of length: {len(data_url)}")
        
        return data_url
    except Exception as e:
        print(f"Error converting image to data URL: {e}")
        raise

@app.route('/api/generate', methods=['POST'])
def generate_image_endpoint():
    """
    Receives an image and description from the Node.js service,
    uses Replicate API to generate jewelry design, and returns the result.
    """
    try:
        print("\n=== Received generation request ===")
        
        if 'file' not in request.files:
            print("Error: No file in request")
            return jsonify({"error": "No image file provided in the request."}), 400

        file = request.files['file']
        description = request.form.get('description', 'beautiful gold jewelry')
        
        print(f"File: {file.filename}")
        print(f"Description: {description}")

        # Read the uploaded image
        image_bytes = file.read()
        print(f"Original image size: {len(image_bytes)} bytes")
        
        # Convert image to data URL for Replicate
        print("Converting and optimizing image...")
        image_data_url = image_to_data_url(image_bytes)
        
        # Prepare the prompt
        enhanced_prompt = f"Transform this jewelry sketch into a realistic, high-quality photograph of {description}. The image should show detailed metalwork, proper lighting, and professional jewelry photography quality."
        
        print(f"Enhanced prompt: {enhanced_prompt}")
        print("Calling Replicate API...")
        
        # Call Replicate API using flux-kontext-pro
        input_data = {
            "prompt": enhanced_prompt,
            "input_image": image_data_url,
            "output_format": "png",
            "aspect_ratio": "1:1",
            "guidance_scale": 3.5,
        }
        
        output = replicate.run(
            "black-forest-labs/flux-kontext-pro",
            input=input_data
        )
        
        print(f"Replicate output type: {type(output)}")
        
        # Handle different output formats from Replicate
        image_url = None
        
        if hasattr(output, 'url'):
            # It's a FileOutput object - access url as property, not method
            image_url = output.url
        elif isinstance(output, str):
            image_url = output
        elif isinstance(output, list) and len(output) > 0:
            image_url = output[0]
        elif isinstance(output, bytes):
            # If output is already bytes, use it directly
            img_byte_arr = io.BytesIO(output)
            img_byte_arr.seek(0)
            print("✓ Successfully generated image (bytes)")
            return send_file(img_byte_arr, mimetype='image/png')
        else:
            raise ValueError(f"Unexpected output format from Replicate: {type(output)}")
        
        if image_url:
            print(f"Generated image URL: {image_url}")
            
            # Download the image with a longer timeout
            print("Downloading generated image...")
            response = requests.get(image_url, timeout=60)
            response.raise_for_status()
            image_data = response.content
            
            print(f"Downloaded image size: {len(image_data)} bytes")
            
            # Create a BytesIO object to send the image
            img_byte_arr = io.BytesIO(image_data)
            img_byte_arr.seek(0)
            
            print("✓ Successfully generated image")
            return send_file(img_byte_arr, mimetype='image/png')
        else:
            raise ValueError("No image URL or data received from Replicate")

    except replicate.exceptions.ReplicateError as e:
        print(f"\n✗ Replicate API ERROR:")
        print(f"Error message: {str(e)}")
        traceback.print_exc()
        return jsonify({
            "error": "Error from Replicate API",
            "details": str(e)
        }), 500
        
    except requests.exceptions.Timeout as e:
        print(f"\n✗ Timeout ERROR:")
        print(f"Error message: {str(e)}")
        return jsonify({
            "error": "Request timed out",
            "details": "The image generation took too long. Please try again with a smaller image."
        }), 504
        
    except Exception as e:
        print(f"\n✗ ERROR in /api/generate:")
        print(f"Error type: {type(e).__name__}")
        print(f"Error message: {str(e)}")
        traceback.print_exc()
        return jsonify({
            "error": "An internal error occurred during image generation.",
            "details": str(e)
        }), 500

@app.route('/api/health', methods=['GET'])
def health_check():
    """Check if the service is running and API key is configured."""
    api_key_configured = bool(os.getenv('REPLICATE_API_TOKEN'))
    return jsonify({
        "status": "healthy",
        "api_configured": api_key_configured,
        "service": "Replicate Flux Kontext Pro"
    })

if __name__ == '__main__':
    # Check if API key is configured
    if not os.getenv('REPLICATE_API_TOKEN'):
        print("\n⚠ WARNING: REPLICATE_API_TOKEN not found in environment variables!")
        print("Please add it to your .env file:")
        print("REPLICATE_API_TOKEN=your_api_token_here\n")
    else:
        print("\n✓ Replicate API token configured")
    
    print("\n>>> Starting Flask ML Service on http://localhost:4000 <<<")
    print(">>> Health check: http://localhost:4000/api/health <<<")
    print(">>> Using Replicate Flux Kontext Pro model <<<\n")
    app.run(host='0.0.0.0', port=4000, debug=True)