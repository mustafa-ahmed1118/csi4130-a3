import os

files = ["positions", "index", "normals"]
file_name = files[2]
input_dir = "truck_data"
output_dir = "formatted_truck_data"


# Create the output directory if it doesn't exist
os.makedirs(output_dir, exist_ok=True)

with open(f"./{input_dir}/{file_name}.txt", "r") as infile, open(f"./{output_dir}/formatted_{file_name}.txt", "w") as outfile:
    for line in infile:
        formatted_line = ", ".join(line.split()) + ",\n"
        outfile.write(formatted_line)

